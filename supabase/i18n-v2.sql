-- =====================================================================
-- supabase/i18n-v2.sql — content translation v2 (CLCAuto)
--
-- The database is the single choke point for every writer (browser RLS, native app,
-- sync + API v1 [service role], admin UI, SQL editor, scripts, pg_cron):
--   * originals are verbatim author/source text (cars.description_original, features_original,
--     community_posts.title/content/tags, *.content); machine output never lands there
--   * translations live in the private schema i18n (no PostgREST exposure, no API-role grants);
--     reads go through visibility-enforcing SECURITY DEFINER RPCs, writes through service_role RPCs
--   * any source change by any writer re-hashes and resets every locale in the same transaction
--   * the queue is i18n.translations (lease token + CAS completion)
--   * ai_moderation rows can only be created by the pipeline (old code fails open)
--
-- Idempotent: run the WHOLE file in the Supabase SQL editor; safe to re-run.
-- First run leaves i18n.settings.enforce = false ("observe mode") and
-- moderation_enforce = false ("shadow mode"). See docs in the spec, section 10.
-- Requires: public.is_admin() (supabase/admin-expiry.sql), pg_cron, PostgreSQL >= 15.
-- Lock order used by every function in this file: base row -> i18n.sources -> i18n.translations.
-- =====================================================================
begin;

-- ---------- 0. Private schema first (trigger functions below live in it) ----------
create schema if not exists i18n;
revoke all on schema i18n from public, anon, authenticated, service_role;

-- ---------- 1. Moderation prerequisites (supabase/ai-moderation.sql was never applied in prod) ----------
alter table public.comments       add column if not exists status text not null default 'active';
alter table public.post_comments  add column if not exists status text not null default 'active';
alter table public.qa_answers     add column if not exists status text not null default 'active';
alter table public.dealer_reviews add column if not exists status text not null default 'active';
do $$
declare t text;
begin
  foreach t in array array['comments','post_comments','qa_answers','dealer_reviews'] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_status_check');
    execute format('alter table public.%I add constraint %I check (status in (''active'',''blocked''))', t, t || '_status_check');
  end loop;
end $$;

create table if not exists public.ai_moderation (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  user_id uuid,
  content text not null,
  categories text[] not null default '{}',
  reason text,
  model text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  unique (target_type, target_id)
);
-- context: target_type 'translation' = {"entity": "<entity>", "locales": ["ko", ...], "src_hash": "<sources.src_hash>"}
-- (rejected machine output, i18n_complete); null for other types. Fast-rollback parking (i18n-v2-rollback.sql header)
-- adds "parked": true to pending flags of v2-only types, so a parked non-translation flag holds only {"parked": true}.
alter table public.ai_moderation add column if not exists context jsonb;
alter table public.ai_moderation drop constraint if exists ai_moderation_status_check;
alter table public.ai_moderation add constraint ai_moderation_status_check
  check (status in ('pending','restored','confirmed','shadow'));
alter table public.ai_moderation drop constraint if exists ai_moderation_target_type_check;
alter table public.ai_moderation add constraint ai_moderation_target_type_check
  check (target_type in ('car','post','car_comment','post_comment','qa_question','qa_answer','dealer_review','translation'));
create index if not exists ai_moderation_status_idx on public.ai_moderation (status, created_at desc);
alter table public.ai_moderation enable row level security;
drop policy if exists ai_moderation_admin on public.ai_moderation;
create policy ai_moderation_admin on public.ai_moderation
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- Admin audit rows for AI-moderation decisions name the flag's target type: prod's list ('user','car','store',
-- 'report') + 'source' (listing-source toggles) + every ai_moderation target type. Widening only.
alter table public.admin_actions drop constraint if exists admin_actions_target_type_check;
alter table public.admin_actions add constraint admin_actions_target_type_check
  check (target_type in ('user','car','store','report','source','post','car_comment','post_comment','qa_question',
                         'qa_answer','dealer_review','translation'));

-- B33: reply target is structured data; content stays the author's own text.
-- reply_to_name is trigger-derived (i18n.ugc_before): never the client's value.
alter table public.post_comments add column if not exists reply_to_user_id uuid references public.profiles(id) on delete set null;
alter table public.post_comments add column if not exists reply_to_name text;
alter table public.post_comments drop constraint if exists post_comments_reply_to_name_len;
alter table public.post_comments add constraint post_comments_reply_to_name_len
  check (char_length(reply_to_name) <= 40) not valid;

-- ---------- 2. New base-table columns ----------
alter table public.cars add column if not exists description_original text;        -- verbatim, any language
alter table public.cars add column if not exists features_original text[] not null default '{}';
alter table public.cars add column if not exists content_updated_at timestamptz;   -- trigger-owned content clock
alter table public.cars add column if not exists removal_reason text;              -- trigger-owned (B10)
alter table public.cars add column if not exists original_uncertain boolean not null default false; -- legacy AI-touched original (R3)
alter table public.cars drop constraint if exists cars_removal_reason_check;
alter table public.cars add constraint cars_removal_reason_check
  check (removal_reason is null or removal_reason in ('moderation','admin','other'));
alter table public.community_posts add column if not exists content_updated_at timestamptz;
create index if not exists cars_public_content_updated_idx on public.cars (content_updated_at desc)
  where status = 'active' and not owner_hidden;

-- Input caps = cost bounds. NOT VALID: existing rows are not rescanned, every new write is checked.
-- Live maxima 2026-10-12: car description 3234, post title 43 / content 584, comment 357.
alter table public.cars drop constraint if exists cars_description_original_len;
alter table public.cars add constraint cars_description_original_len
  check (char_length(description_original) <= 20000) not valid;
alter table public.community_posts drop constraint if exists community_posts_text_len;
alter table public.community_posts add constraint community_posts_text_len
  check (char_length(title) <= 200 and char_length(content) <= 20000) not valid;
alter table public.post_comments drop constraint if exists post_comments_text_len;
alter table public.post_comments add constraint post_comments_text_len check (char_length(content) <= 5000) not valid;
alter table public.comments drop constraint if exists comments_text_len;
alter table public.comments add constraint comments_text_len check (char_length(content) <= 5000) not valid;
alter table public.qa_questions drop constraint if exists qa_questions_text_len;
alter table public.qa_questions add constraint qa_questions_text_len
  check (char_length(title) <= 300 and char_length(content) <= 20000) not valid;
alter table public.qa_answers drop constraint if exists qa_answers_text_len;
alter table public.qa_answers add constraint qa_answers_text_len check (char_length(content) <= 10000) not valid;
alter table public.dealer_reviews drop constraint if exists dealer_reviews_text_len;
alter table public.dealer_reviews add constraint dealer_reviews_text_len check (char_length(content) <= 5000) not valid;

-- ---------- 3. Private tables ----------
create table if not exists i18n.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into i18n.settings (key, value) values
  ('enforce', 'false'),             -- observe mode until the new code is live (spec 10.1)
  ('moderation_enforce', 'false'),  -- shadow mode: verdicts recorded, nothing hidden
  ('daily_call_cap', '20000'),      -- circuit breaker: translation / detection / glossary LLM calls per UTC day
  ('daily_moderation_cap', '20000'),-- separate breaker for moderation calls: translation spend never stops moderation
  ('daily_moderation_cap_per_author', '200'), -- verdicts per content author per UTC day: one account cannot drain
                                              -- daily_moderation_cap; its further content waits for the next day
  ('max_attempts', '6'),
  ('moderate_outputs', 'true')
on conflict (key) do nothing;

create table if not exists i18n.budget (
  day date primary key,
  calls int not null default 0,
  in_tokens bigint not null default 0,
  out_tokens bigint not null default 0
);
alter table i18n.budget add column if not exists mod_calls int not null default 0;   -- moderation calls (own cap)
-- Moderation verdicts per content author (i18n.entity_owner) per UTC day: daily_moderation_cap_per_author
create table if not exists i18n.mod_author_budget (
  day date not null,
  user_id uuid not null,
  verdicts int not null default 0,
  primary key (day, user_id)
);

-- Deterministic title maps, seeded from lib/mock-data MAKES_ZH and lib/i18n/car-title MODEL_ZH_BY_MAKE
create table if not exists i18n.make_zh (make text primary key, zh text not null);
create table if not exists i18n.model_zh (make text not null, model_norm text not null, zh text not null,
  primary key (make, model_norm));

create table if not exists i18n.sources (
  entity text not null check (entity in ('car','post','post_comment','car_comment','qa_question','qa_answer','dealer_review')),
  entity_id uuid not null,
  car_id           uuid references public.cars(id)            on delete cascade,
  post_id          uuid references public.community_posts(id) on delete cascade,
  post_comment_id  uuid references public.post_comments(id)   on delete cascade,
  car_comment_id   uuid references public.comments(id)        on delete cascade,
  qa_question_id   uuid references public.qa_questions(id)    on delete cascade,
  qa_answer_id     uuid references public.qa_answers(id)      on delete cascade,
  dealer_review_id uuid references public.dealer_reviews(id)  on delete cascade,
  src_hash text not null,             -- hash of the normalized translatable payload (i18n.payload_of)
  field_langs jsonb,                  -- {"title":"zh","content":"en"}; valid iff detected_hash = src_hash
  primary_lang text,                  -- language of the longest non-und field ("Translated from X")
  detected_hash text,
  moderation text not null default 'pending' check (moderation in ('pending','pass','flagged','blocked','skipped')),
  moderated_hash text,                -- mod_hash the verdict applies to (settled iff = mod_hash)
  moderation_attempts int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (entity, entity_id),
  constraint sources_one_parent check (num_nonnulls(car_id, post_id, post_comment_id, car_comment_id,
    qa_question_id, qa_answer_id, dealer_review_id) = 1),
  constraint sources_parent_is_entity check (entity_id = coalesce(car_id, post_id, post_comment_id,
    car_comment_id, qa_question_id, qa_answer_id, dealer_review_id))
);
alter table i18n.sources drop constraint if exists sources_moderation_check;
alter table i18n.sources add constraint sources_moderation_check
  check (moderation in ('pending','pass','flagged','blocked','skipped'));
-- trusted = the CURRENT moderated text was written by a trusted syndication writer (service/system/pipeline writer
-- AND cars.source_id set AND the car held by that source's system account). Only trusted text skips input + output
-- moderation. Browser users can neither set source_id (cars_before) nor produce trusted text (cars_after decides
-- by writer class). After an untrusted edit, trust comes back only once that version got 'pass' or the trusted
-- writer restores the last trusted version (trusted_mod_hash), see i18n.sync_source.
alter table i18n.sources add column if not exists trusted boolean not null default false;
alter table i18n.sources add column if not exists trusted_mod_hash text;   -- mod_hash of the last trusted version
-- mod_hash = hash of i18n.moderation_payload: everything moderation reads (a superset of the translation payload:
-- car make/model/trim + feature tags, post/question tags). It keys the verdict, so a features-, trim- or tags-only
-- edit is moderated again while its translations stay valid. Backfilled in section 5 for rows of an earlier run.
alter table i18n.sources add column if not exists mod_hash text;
alter table i18n.sources add column if not exists mod_lease_until timestamptz;   -- public.i18n_moderation_queue lease
-- first content-specific failure ('error') of the current mod_hash: 3 strikes fail open only when they span at least
-- 30 minutes (an outage the systemic classification missed must not wave content through); reset with the attempts
alter table i18n.sources add column if not exists moderation_first_error_at timestamptz;
-- src_hash an admin restored after its machine output was rejected: that version skips output moderation
alter table i18n.sources add column if not exists output_override_hash text;
-- detection recorded from the local detector's best guess (no LLM): served like a detection (read model, sitemaps),
-- but the worker and the LLM detection pass still refine it
alter table i18n.sources add column if not exists detect_provisional boolean not null default false;
create index if not exists sources_mod_due_idx on i18n.sources (updated_at)
  where not trusted and moderation_attempts < 3
    and (moderation not in ('pass','flagged','blocked','skipped') or moderated_hash is distinct from mod_hash);

-- One row per (entity, locale). The table is also the job queue (lease = token + expiry).
create table if not exists i18n.translations (
  id bigint generated always as identity primary key,
  entity text not null,
  entity_id uuid not null,
  locale text not null check (locale in ('zh','en','ko','ja','es','fr')),
  src_hash text not null,                  -- source version this row targets / was made from
  state text not null default 'pending'
    check (state in ('pending','ok','skipped','failed','dead','hold','rejected')),
  fields jsonb,                            -- {"content":"..."}: only fields that needed translation; state = 'ok'
  source_lang text,                        -- language it was translated from
  pivot text,                              -- 'en' when produced from the English rendering
  origin text,                             -- 'pipeline' | 'legacy'
  refresh boolean not null default false,  -- ok but should be regenerated (legacy import / prompt bump)
  model text,
  prompt_version int,
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  priority smallint not null default 5,    -- 0 = most urgent
  last_error text,
  translated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (entity, entity_id, locale),
  foreign key (entity, entity_id) references i18n.sources (entity, entity_id) on delete cascade
);
create index if not exists translations_due_idx on i18n.translations (priority, next_attempt_at)
  where state in ('pending','failed') or (state = 'ok' and refresh);

-- Glossary: topics (#hashtags, post tags) and car features. Identity = (kind, slug); spellings = aliases.
create table if not exists i18n.terms (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('topic','feature')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 48),
  labels jsonb not null default '{}'::jsonb,  -- {"zh":"特斯拉","en":"Tesla","ko":"테슬라","ja":"テスラ","es":"Tesla","fr":"Tesla"}
  origin text not null check (origin in ('brand','model','dictionary','llm','admin')),
  merged_into bigint references i18n.terms(id),
  model text,
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);
create table if not exists i18n.term_aliases (
  kind text not null check (kind in ('topic','feature')),
  alias_norm text not null,                -- i18n.norm_tag(spelling)
  term_id bigint references i18n.terms(id) on delete cascade,   -- null until resolved
  sample_raw text not null,
  state text not null default 'pending' check (state in ('pending','ok','failed','dead','rejected')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  last_error text,
  primary key (kind, alias_norm)
);
create index if not exists term_aliases_due_idx on i18n.term_aliases (next_attempt_at) where state in ('pending','failed');
create index if not exists term_aliases_term_idx on i18n.term_aliases (term_id);
-- lang = language of the spelling itself (seed label key, or lib/i18n/detect.ts on sample_raw at resolution).
-- Display rule: a tag already written in the UI language is shown verbatim, never as another term's label.
alter table i18n.term_aliases add column if not exists lang text;

create table if not exists i18n.post_tags (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  kind text not null default 'topic' check (kind = 'topic'),
  alias_norm text not null,
  raw text not null,
  pos int not null,
  primary key (post_id, alias_norm),
  foreign key (kind, alias_norm) references i18n.term_aliases (kind, alias_norm)
);
create index if not exists post_tags_alias_idx on i18n.post_tags (alias_norm);

create table if not exists i18n.car_features (
  car_id uuid not null references public.cars(id) on delete cascade,
  kind text not null default 'feature' check (kind = 'feature'),
  alias_norm text not null,
  raw text not null,
  pos int not null,
  primary key (car_id, alias_norm),
  foreign key (kind, alias_norm) references i18n.term_aliases (kind, alias_norm)
);
create index if not exists car_features_alias_idx on i18n.car_features (alias_norm);

-- One-time snapshot of the legacy compat text + caches, taken by i18n-v2-data.sql BEFORE anything rewrites them
-- (the enforce flip re-projects cars.description/description_zh). Read only through public.i18n_legacy_page
-- by scripts/i18n-backfill.ts --import-legacy, which validates each entry against the current original.
create table if not exists i18n.legacy_text (
  entity text not null check (entity in ('car','post','post_comment','car_comment')),
  entity_id uuid not null,
  legacy jsonb not null,      -- cars: {description, description_zh, other_i18n}; others: {other_i18n}
  stashed_at timestamptz not null default now(),
  primary key (entity, entity_id)
);

revoke all on all tables in schema i18n from public, anon, authenticated, service_role;
revoke all on all sequences in schema i18n from public, anon, authenticated, service_role;

-- ---------- 4. Pure helpers ----------
-- norm_text, payload_of and hash_payload are mirrored by lib/i18n/content/store.ts sourceHash (the client checks that
-- a bundle row's h belongs to the original on screen): change the normalization, payload keys or hash format there
-- too (a mismatch only hides translations, it never shows a wrong one; scripts/i18n-db-test.ts pins the vectors).
create or replace function i18n.norm_text(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select nullif(btrim(regexp_replace(normalize(replace(coalesce(t, ''), E'\r\n', E'\n'), NFC),
                                     E'[ \\t]+\\n', E'\n', 'g')), '')
$$;

-- text[] -> jsonb array of norm_text values (order kept, empties dropped); NULL when nothing is left
create or replace function i18n.norm_list(p text[]) returns jsonb
language sql immutable parallel safe set search_path = '' as $$
  select jsonb_agg(s.v order by s.o) from (
    select i18n.norm_text(u.x) as v, u.o from unnest(coalesce(p, '{}')) with ordinality as u(x, o)
  ) s where s.v is not null
$$;

-- Tag/alias normalization. Mirrored EXACTLY by lib/i18n/hashtags.ts normTag():
-- trim, strip leading #/＃, NFKC, drop whitespace/_/./·/・/-, lowercase, max 80 chars, '' -> null.
-- Whitespace here, in public.i18n_norm_tag and in i18n.hashtag_tokens = JS \s (what String.prototype.trim strips),
-- spelled out because btrim only strips ' ' and [[:space:]] follows the server's libc locale (no U+00A0 / U+202F /
-- U+FEFF; musl adds U+0085): \t \n \v \f \r, space, U+00A0, U+1680, U+2000-U+200A, U+2028, U+2029, U+202F, U+205F,
-- U+3000, U+FEFF.
create or replace function i18n.norm_tag(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select nullif(left(lower(regexp_replace(normalize(regexp_replace(regexp_replace(coalesce(t, ''),
           '^[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+|[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$', '', 'g'),
           '^[#＃]+', ''), NFKC),
         '[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff_.·・\-]+', '', 'g')), 80), '')
$$;

-- jsonb text form (keys sorted by length, then bytes) -> sha256 hex, first 32 chars. Mirrored by
-- lib/i18n/content/store.ts sourceHash (see norm_text).
create or replace function i18n.hash_payload(p jsonb) returns text
language sql immutable parallel safe set search_path = '' as $$
  select left(encode(sha256(convert_to(coalesce(p, '{}'::jsonb)::text, 'UTF8')), 'hex'), 32)
$$;

-- Post tags: trim, drop empties, case-insensitive dedupe, cap count/length (live max: 4 tags, 13 chars)
create or replace function i18n.clean_tags(p text[], p_max int, p_maxlen int) returns text[]
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(array_agg(v order by o), '{}') from (
    select v, o from (
      select distinct on (lower(v)) v, o
      from (select left(btrim(x), p_maxlen) as v, o from unnest(coalesce(p, '{}')) with ordinality as u(x, o)) s
      where v <> '' order by lower(v), o
    ) d order by o limit p_max
  ) c
$$;

-- Car feature originals: trim + drop empties + exact dedupe, order kept, NOTHING truncated
-- (live: 174 active cars have > 60 features, max 115; longest tag 205 chars)
create or replace function i18n.dedupe_tags(p text[]) returns text[]
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(array_agg(v order by o), '{}') from (
    select distinct on (v) v, o
    from (select btrim(x) as v, o from unnest(coalesce(p, '{}')) with ordinality as u(x, o)) s
    where v <> '' order by v, o
  ) d
$$;

create or replace function i18n.setting_text(k text) returns text
language sql stable security definer set search_path = '' as $$
  select (select value #>> '{}' from i18n.settings where key = k)
$$;
create or replace function i18n.setting_bool(k text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(i18n.setting_text(k)::boolean, false)
$$;
create or replace function i18n.setting_int(k text) returns int
language sql stable security definer set search_path = '' as $$
  select i18n.setting_text(k)::int
$$;

-- Who is writing? pipeline GUC (only set inside our SECURITY DEFINER RPCs; PostgREST clients cannot set GUCs)
-- > JWT role from PostgREST request.jwt.claims > direct DB session (SQL editor, pg_cron, migrations)
create or replace function i18n.writer_class() returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_role text;
begin
  if coalesce(current_setting('i18n.writer', true), '') = 'pipeline' then return 'pipeline'; end if;
  v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  if v_role = 'service_role' then return 'service'; end if;
  if v_role = 'authenticated' then
    return case when public.is_admin() then 'admin' else 'user' end;
  end if;
  if v_role = 'anon' then return 'anon'; end if;
  return 'system';
end $$;

create or replace function i18n.backoff(p_attempts int) returns interval
language sql immutable parallel safe set search_path = '' as $$
  select make_interval(secs => least(86400, 60 * power(4, greatest(p_attempts - 1, 0)))::int)
$$;

-- Deterministic titles (R10): en = year make model trim; zh = year MAKES_ZH[make] MODEL_ZH_BY_MAKE[make][model] trim
create or replace function i18n.car_title(p_year int, p_make text, p_model text, p_trim text, p_lang text)
returns text language sql stable security definer set search_path = '' as $$
  select concat_ws(' ', p_year::text,
    case when p_lang = 'zh' then coalesce((select zh from i18n.make_zh where make = p_make), p_make) else p_make end,
    case when p_lang = 'zh' then coalesce((select zh from i18n.model_zh where make = p_make
                                           and model_norm = lower(btrim(p_model))), btrim(p_model)) else btrim(p_model) end,
    nullif(btrim(coalesce(p_trim, '')), ''))
$$;

-- ---------- 5. Source payloads and visibility ----------
-- Translation payload (keys = translatable fields, values = norm_text). Mirrored by lib/i18n/content/store.ts
-- sourceHash (see norm_text): a new field or key name must be added there too.
create or replace function i18n.payload_of(p_entity text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  case p_entity
    when 'car' then
      select jsonb_build_object('description', i18n.norm_text(c.description_original)) into v from public.cars c where c.id = p_id;
    when 'post' then
      select jsonb_build_object('title', i18n.norm_text(p.title), 'content', i18n.norm_text(p.content)) into v
        from public.community_posts p where p.id = p_id;
    when 'post_comment' then
      select jsonb_build_object('content', i18n.norm_text(x.content)) into v from public.post_comments x where x.id = p_id;
    when 'car_comment' then
      select jsonb_build_object('content', i18n.norm_text(x.content)) into v from public.comments x where x.id = p_id;
    when 'qa_question' then
      select jsonb_build_object('title', i18n.norm_text(q.title), 'content', i18n.norm_text(q.content)) into v
        from public.qa_questions q where q.id = p_id;
    when 'qa_answer' then
      select jsonb_build_object('content', i18n.norm_text(x.content)) into v from public.qa_answers x where x.id = p_id;
    when 'dealer_review' then
      select jsonb_build_object('content', i18n.norm_text(x.content)) into v from public.dealer_reviews x where x.id = p_id;
    else v := null;
  end case;
  return jsonb_strip_nulls(v);
end $$;

-- Everything moderation reads (its hash = sources.mod_hash, the verdict key). Superset of payload_of: car
-- make/model/trim (free text in /post, car-edit and API v1; they end up in the deterministic title) and feature
-- tags; post and question tags. Empty strings / empty arrays are dropped: '{}' = nothing to moderate.
create or replace function i18n.moderation_payload(p_entity text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  case p_entity
    when 'car' then
      select jsonb_build_object('description', i18n.norm_text(c.description_original), 'make', i18n.norm_text(c.make),
               'model', i18n.norm_text(c.model), 'trim', i18n.norm_text(c.trim),
               'features', i18n.norm_list(c.features_original)) into v
        from public.cars c where c.id = p_id;
    when 'post' then
      select jsonb_build_object('title', i18n.norm_text(p.title), 'content', i18n.norm_text(p.content),
               'tags', i18n.norm_list(p.tags)) into v
        from public.community_posts p where p.id = p_id;
    when 'qa_question' then
      select jsonb_build_object('title', i18n.norm_text(q.title), 'content', i18n.norm_text(q.content),
               'tags', i18n.norm_list(q.tags)) into v
        from public.qa_questions q where q.id = p_id;
    else return i18n.payload_of(p_entity, p_id);
  end case;
  return jsonb_strip_nulls(v);
end $$;

-- Re-run of a database migrated before mod_hash existed: verdicts recorded for the old key stay settled only where
-- moderation already read exactly this text (no extra make/model/trim/features/tags) or the text is trusted;
-- everything else is moderated again (its features / tags never were).
update i18n.sources s set
  mod_hash = i18n.hash_payload(i18n.moderation_payload(s.entity, s.entity_id)),
  moderated_hash = case
    when s.moderated_hash = s.src_hash
         and (s.trusted or i18n.moderation_payload(s.entity, s.entity_id) = i18n.payload_of(s.entity, s.entity_id))
      then i18n.hash_payload(i18n.moderation_payload(s.entity, s.entity_id))
    else s.moderated_hash end
 where s.mod_hash is null;
update i18n.sources s set trusted_mod_hash = s.mod_hash where s.trusted and s.trusted_mod_hash is null;

-- The ONE definition of "may this be shown/translated publicly?" (claims, completion, every read, sitemaps)
create or replace function i18n.entity_is_public(p_entity text, p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_entity
    when 'car' then exists (select 1 from public.cars c where c.id = p_id and c.status = 'active' and not c.owner_hidden)
    when 'post' then exists (select 1 from public.community_posts p where p.id = p_id and p.status = 'active')
    when 'post_comment' then exists (select 1 from public.post_comments x join public.community_posts p on p.id = x.post_id
                                     where x.id = p_id and x.status = 'active' and p.status = 'active')
    when 'car_comment' then exists (select 1 from public.comments x join public.cars c on c.id = x.car_id
                                    where x.id = p_id and x.status = 'active' and c.status = 'active' and not c.owner_hidden)
    when 'qa_question' then exists (select 1 from public.qa_questions q where q.id = p_id and coalesce(q.status, 'active') = 'active')
    when 'qa_answer' then exists (select 1 from public.qa_answers a join public.qa_questions q on q.id = a.question_id
                                  where a.id = p_id and a.status = 'active' and coalesce(q.status, 'active') = 'active')
    when 'dealer_review' then exists (select 1 from public.dealer_reviews r where r.id = p_id and r.status = 'active')
    else false end
$$;

-- Lock the base row first (global lock order: base row -> sources -> translations)
create or replace function i18n.lock_base(p_entity text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  case p_entity
    when 'car' then perform 1 from public.cars where id = p_id for update;
    when 'post' then perform 1 from public.community_posts where id = p_id for update;
    when 'post_comment' then perform 1 from public.post_comments where id = p_id for update;
    when 'car_comment' then perform 1 from public.comments where id = p_id for update;
    when 'qa_question' then perform 1 from public.qa_questions where id = p_id for update;
    when 'qa_answer' then perform 1 from public.qa_answers where id = p_id for update;
    when 'dealer_review' then perform 1 from public.dealer_reviews where id = p_id for update;
    else null;
  end case;
end $$;

-- ---------- 6. Source/queue maintenance (called only from triggers and pipeline RPCs) ----------
-- p_trusted: the text was written by a trusted syndication writer (see cars_after) -> moderation 'skipped'.
-- Two keys: src_hash (translation payload) resets detection + every locale row; mod_hash (moderation payload)
-- resets the verdict and trust. A features-, trim- or tags-only edit therefore re-moderates without re-translating.
drop function if exists i18n.sync_source(text, uuid, boolean, text, smallint);
create or replace function i18n.sync_source(p_entity text, p_id uuid, p_public boolean, p_trusted boolean default false,
                                            p_priority smallint default 0)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_payload jsonb := i18n.payload_of(p_entity, p_id);
  v_mod jsonb := i18n.moderation_payload(p_entity, p_id);
  v_hash text;
  v_mod_hash text;
  v_empty boolean;
  v_mod_empty boolean;
  v_old i18n.sources%rowtype;
  v_trusted boolean := coalesce(p_trusted, false);
begin
  if v_payload is null then return; end if;           -- row vanished
  v_hash := i18n.hash_payload(v_payload);
  v_mod_hash := i18n.hash_payload(v_mod);
  v_empty := v_payload = '{}'::jsonb;
  v_mod_empty := v_mod = '{}'::jsonb;
  select * into v_old from i18n.sources where entity = p_entity and entity_id = p_id for update;
  if not found then
    insert into i18n.sources (entity, entity_id, car_id, post_id, post_comment_id, car_comment_id, qa_question_id,
                              qa_answer_id, dealer_review_id, src_hash, mod_hash, moderation, moderated_hash, trusted,
                              trusted_mod_hash)
    values (p_entity, p_id,
      case when p_entity = 'car' then p_id end, case when p_entity = 'post' then p_id end,
      case when p_entity = 'post_comment' then p_id end, case when p_entity = 'car_comment' then p_id end,
      case when p_entity = 'qa_question' then p_id end, case when p_entity = 'qa_answer' then p_id end,
      case when p_entity = 'dealer_review' then p_id end,
      v_hash, v_mod_hash, case when v_mod_empty or v_trusted then 'skipped' else 'pending' end,
      case when v_mod_empty or v_trusted then v_mod_hash end, v_trusted and not v_mod_empty,
      case when v_trusted and not v_mod_empty then v_mod_hash end)
    on conflict (entity, entity_id) do nothing;
    insert into i18n.translations (entity, entity_id, locale, src_hash, state, priority)
    select p_entity, p_id, l, v_hash, case when v_empty then 'skipped' when p_public then 'pending' else 'hold' end, p_priority
    from unnest(array['zh','en','ko','ja','es','fr']) as l
    on conflict (entity, entity_id, locale) do nothing;
    return;
  end if;
  if v_old.src_hash is distinct from v_hash then
    update i18n.sources set
      src_hash = v_hash, field_langs = null, primary_lang = null, detected_hash = null, detect_provisional = false,
      updated_at = now()
    where entity = p_entity and entity_id = p_id;
    -- Invariant: every locale row now targets the new version; old text is discarded and
    -- outstanding leases are revoked (lease_token cleared => completion CAS fails).
    update i18n.translations set
      src_hash = v_hash,
      state = case when v_empty then 'skipped' when p_public then 'pending' else 'hold' end,
      fields = null, source_lang = null, pivot = null, origin = null, refresh = false,
      attempts = 0, next_attempt_at = now(), lease_token = null, lease_until = null,
      last_error = null, translated_at = null, priority = p_priority, updated_at = now()
    where entity = p_entity and entity_id = p_id;
  end if;
  if v_old.mod_hash is distinct from v_mod_hash then
    -- new moderated text: verdict and trust follow the CURRENT writer (a claimant's features edit drops trust).
    -- A trusted write re-grants trust only over a version that needed no verdict or got 'pass' (trusted, empty,
    -- or settled 'pass'), or when it restores the last trusted version exactly. Otherwise the row may still hold
    -- untrusted fields the trusted writer did not rewrite (sync rewrites description + features, never make /
    -- model / trim) that were never moderated or were flagged, so the new version stays untrusted and is
    -- moderated as a whole.
    v_trusted := v_trusted and coalesce(v_old.trusted or v_old.mod_hash = i18n.hash_payload('{}'::jsonb)
                                        or (v_old.moderation = 'pass' and v_old.moderated_hash = v_old.mod_hash)
                                        or v_mod_hash = v_old.trusted_mod_hash, false);
    update i18n.sources set
      mod_hash = v_mod_hash,
      moderation = case when v_mod_empty or v_trusted then 'skipped' else 'pending' end,
      moderated_hash = case when v_mod_empty or v_trusted then v_mod_hash end,
      trusted = v_trusted and not v_mod_empty,
      trusted_mod_hash = case when v_trusted and not v_mod_empty then v_mod_hash else trusted_mod_hash end,
      moderation_attempts = 0, moderation_first_error_at = null, mod_lease_until = null, updated_at = now()
    where entity = p_entity and entity_id = p_id;
  end if;
end $$;

-- Visibility flips. Hidden: queued rows wait in 'hold'; ok rows due for a regeneration (refresh) are parked
-- (next_attempt_at = 'infinity') so they never occupy i18n_claim's candidate window. Public again: both resume.
create or replace function i18n.set_public(p_entity text, p_ids uuid[], p_public boolean)
returns void language sql security definer set search_path = '' as $$
  update i18n.translations t
     set state = case when p_public then 'pending' else 'hold' end,
         next_attempt_at = case when p_public then now() else t.next_attempt_at end,
         updated_at = now()
   where t.entity = p_entity and t.entity_id = any(p_ids)
     and ((p_public and t.state = 'hold') or (not p_public and t.state in ('pending','failed')));
  update i18n.translations t
     set next_attempt_at = case when p_public then now() else 'infinity'::timestamptz end, updated_at = now()
   where t.entity = p_entity and t.entity_id = any(p_ids)
     and ((p_public and t.next_attempt_at = 'infinity')
          or (not p_public and t.state = 'ok' and t.refresh and t.next_attempt_at <> 'infinity'));
$$;

-- Seller-provided feature tags -> alias rows (resolution jobs) + per-car link rows (every tag kept)
create or replace function i18n.sync_car_features(p_car uuid, p_tags text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into i18n.term_aliases (kind, alias_norm, sample_raw)
  select distinct on (i18n.norm_tag(x)) 'feature', i18n.norm_tag(x), x
  from unnest(coalesce(p_tags, '{}')) as x where i18n.norm_tag(x) is not null
  on conflict (kind, alias_norm) do nothing;
  delete from i18n.car_features where car_id = p_car;
  insert into i18n.car_features (car_id, alias_norm, raw, pos)
  select distinct on (i18n.norm_tag(x)) p_car, i18n.norm_tag(x), x, o::int
  from unnest(coalesce(p_tags, '{}')) with ordinality as u(x, o) where i18n.norm_tag(x) is not null
  order by i18n.norm_tag(x), o;
end $$;

-- Hashtag token rule shared with lib/i18n/hashtags.ts extractHashtags: URLs (http(s):// or www. followed by ASCII
-- RFC 3986 characters; lib/i18n/hashtags.ts URL_SOURCE) are blanked first, so a '#fragment' is never a hashtag;
-- then [#＃] + 1..40 chars that are not whitespace (JS \s, see i18n.norm_tag), #/＃ or ASCII/full-width punctuation.
create or replace function i18n.hashtag_tokens(p_text text) returns setof text
language sql immutable parallel safe set search_path = '' as $$
  select m[1] from regexp_matches(
    regexp_replace(coalesce(p_text, ''), '(https?://|www\.)[]A-Za-z0-9._~:/?#[@!$&''()*+,;=%-]+', ' ', 'gi'),
    '[#＃]([^\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff#＃,.;:!?()\[\]{}<>"''，。；：！？、（）【】《》「」『』“”‘’…]{1,40})', 'g') as m
$$;

-- Post topics: tags[] first, then inline #hashtags of title/content; one row per alias (first spelling wins),
-- max 12 per post. n = alias_norm, x = raw spelling, o = position (tags 1.., hashtags 1001..).
create or replace function i18n.post_tag_rows(p_tags text[], p_title text, p_content text)
returns table (n text, x text, o int)
language sql immutable parallel safe set search_path = '' as $$
  select d.n, d.x, d.o from (
    select distinct on (i18n.norm_tag(raw.x)) i18n.norm_tag(raw.x) as n, raw.x, raw.o from (
      select u.x, u.o::int as o from unnest(coalesce(p_tags, '{}')) with ordinality as u(x, o)
      union all
      select h.h, 1000 + (row_number() over ())::int
        from i18n.hashtag_tokens(coalesce(p_title, '') || E'\n' || coalesce(p_content, '')) as h(h)
    ) raw
    where i18n.norm_tag(raw.x) is not null
    order by i18n.norm_tag(raw.x), raw.o
  ) d order by d.o limit 12
$$;

-- The alias set i18n.post_tags should hold for a post, in pos order (the sweep compares it with the stored rows)
create or replace function i18n.post_tag_norms(p_tags text[], p_title text, p_content text) returns text[]
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(array_agg(r.n order by r.o), '{}') from i18n.post_tag_rows(p_tags, p_title, p_content) r
$$;

create or replace function i18n.sync_post_tags(p_post uuid, p_tags text[], p_title text, p_content text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into i18n.term_aliases (kind, alias_norm, sample_raw)
  select 'topic', r.n, r.x from i18n.post_tag_rows(p_tags, p_title, p_content) r
  on conflict (kind, alias_norm) do nothing;
  delete from i18n.post_tags where post_id = p_post;
  insert into i18n.post_tags (post_id, alias_norm, raw, pos)
  select p_post, r.n, r.x, r.o from i18n.post_tag_rows(p_tags, p_title, p_content) r;
end $$;

-- features projection (compat column cars.features) = originals ∪ resolved zh/en labels, case-insensitive dedupe.
-- Keeps browse filters (@> / case-insensitive), facets, keyword search and API v1 working.
create or replace function i18n.project_features(p_tags text[]) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(v order by ord), '{}') from (
    select distinct on (lower(v)) v, ord from (
      select x as v, o * 10 as ord from unnest(coalesce(p_tags, '{}')) with ordinality as u(x, o)
      union all
      select coalesce(tm.labels ->> l.lang, x), o * 10 + l.k
      from unnest(coalesce(p_tags, '{}')) with ordinality as u(x, o)
      join i18n.term_aliases a on a.kind = 'feature' and a.alias_norm = i18n.norm_tag(x) and a.state = 'ok'
      join i18n.terms t0 on t0.id = a.term_id
      join i18n.terms tm on tm.id = coalesce(t0.merged_into, t0.id)
      cross join (values ('zh', 1), ('en', 2)) as l(lang, k)
    ) s where btrim(coalesce(v, '')) <> '' order by lower(v), ord
  ) d
$$;

-- cars.description (en) / description_zh (zh) compat projections: the original when it is already in that
-- language, else the validated translation, else the original (never NULL when an original exists).
create or replace function i18n.project_car_description(p_car uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_src i18n.sources%rowtype; v_orig text; v_lang text; v_en text; v_zh text; v_d text; v_dz text;
begin
  if not i18n.setting_bool('enforce') then return; end if;
  perform set_config('i18n.writer', 'pipeline', true);
  select * into v_src from i18n.sources where entity = 'car' and entity_id = p_car;
  select description_original into v_orig from public.cars where id = p_car;
  if not found then return; end if;
  if v_src.entity_id is not null then
    v_lang := case when v_src.detected_hash = v_src.src_hash then v_src.field_langs ->> 'description' end;
    select t.fields ->> 'description' into v_en from i18n.translations t
     where t.entity = 'car' and t.entity_id = p_car and t.locale = 'en' and t.state = 'ok' and t.src_hash = v_src.src_hash;
    select t.fields ->> 'description' into v_zh from i18n.translations t
     where t.entity = 'car' and t.entity_id = p_car and t.locale = 'zh' and t.state = 'ok' and t.src_hash = v_src.src_hash;
  end if;
  v_d := case when v_lang = 'en' then v_orig else coalesce(v_en, v_orig) end;
  v_dz := case when v_lang = 'zh' then v_orig else coalesce(v_zh, v_orig) end;
  update public.cars c set description = v_d, description_zh = v_dz
   where c.id = p_car and (c.description, c.description_zh) is distinct from (v_d, v_dz);
end $$;

-- Recompute deterministic titles + features projection (+ optionally description projections).
-- Called by i18n_admin_set('enforce', true) (all cars, descriptions too) and by the hourly sweep (bounded).
create or replace function i18n.reproject_cars(p_limit int default 100000, p_descriptions boolean default false) returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0; r record;
begin
  if not i18n.setting_bool('enforce') then return 0; end if;
  perform set_config('i18n.writer', 'pipeline', true);
  with todo as (
    select c.id from public.cars c
     where (c.title, c.title_zh, c.features) is distinct from
           (i18n.car_title(c.year, c.make, c.model, c.trim, 'en'), i18n.car_title(c.year, c.make, c.model, c.trim, 'zh'),
            i18n.project_features(c.features_original))
     limit p_limit
     for update skip locked
  )
  update public.cars c set title = i18n.car_title(c.year, c.make, c.model, c.trim, 'en'),
         title_zh = i18n.car_title(c.year, c.make, c.model, c.trim, 'zh'),
         features = i18n.project_features(c.features_original)
    from todo where c.id = todo.id;
  get diagnostics n = row_count;
  if p_descriptions then
    for r in select c.id from public.cars c where c.description_original is not null limit p_limit loop
      perform i18n.project_car_description(r.id);
    end loop;
  end if;
  return n;
end $$;

-- ---------- 7. BEFORE guards (SECURITY DEFINER; caller class comes from request.jwt.claims) ----------
create or replace function i18n.cars_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cls text := i18n.writer_class();
  v_enforce boolean := i18n.setting_bool('enforce');
begin
  -- (0) Syndication / API identity columns belong to sync + API v1 (service role) and admins. Browser users
  --     (owners, claimants, anon) can neither mark a car as syndicated nor take over a sync / API slot.
  if cls in ('user','anon') then
    if tg_op = 'INSERT' then
      new.source_id := null; new.source_listing_id := null; new.api_key_id := null; new.external_id := null;
    else
      new.source_id := old.source_id; new.source_listing_id := old.source_listing_id;
      new.api_key_id := old.api_key_id; new.external_id := old.external_id;
    end if;
  end if;

  -- (1) Originals. Legacy writers (old native builds, old code during the deploy window) write
  --     description / description_zh / features: map those writes onto the originals.
  if tg_op = 'INSERT' then
    if new.description_original is null then
      new.description_original := case when cls in ('service','system')
        then coalesce(nullif(btrim(new.description), ''), nullif(btrim(new.description_zh), ''))
        else coalesce(nullif(btrim(new.description_zh), ''), nullif(btrim(new.description), '')) end;
    end if;
    if coalesce(cardinality(new.features_original), 0) = 0 then
      new.features_original := coalesce(new.features, '{}');
    end if;
    if cls <> 'pipeline' then new.original_uncertain := false; end if;
  elsif cls <> 'pipeline' then
    if new.description_original is not distinct from old.description_original then
      if new.description_zh is distinct from old.description_zh and new.description is not distinct from old.description then
        new.description_original := new.description_zh;
      elsif new.description is distinct from old.description and new.description_zh is not distinct from old.description_zh then
        new.description_original := new.description;
      elsif new.description is distinct from old.description and new.description_zh is distinct from old.description_zh then
        new.description_original := case when cls in ('service','system')
          then coalesce(new.description, new.description_zh) else coalesce(new.description_zh, new.description) end;
      end if;
    end if;
    if new.features_original is not distinct from old.features_original and new.features is distinct from old.features then
      new.features_original := coalesce(new.features, '{}');
    end if;
    -- original_uncertain is pipeline-owned: non-pipeline writers can only CLEAR it (an edit of the original,
    -- or car-edit's explicit "this is my wording" confirmation sending false); they can never set it.
    new.original_uncertain := case
      when new.description_original is distinct from old.description_original then false
      when old.original_uncertain and new.original_uncertain is false then false
      else old.original_uncertain end;
  end if;
  new.features_original := i18n.dedupe_tags(new.features_original);

  -- (2) content_updated_at is trigger-owned: bumps only on visible content changes by non-pipeline writers
  --     (every field the car page and API v1 show). Pipeline writes (projections, migrations, moderation) never
  --     move it (sitemap lastmod, API updated_since).
  if tg_op = 'INSERT' then
    new.content_updated_at := case when cls = 'pipeline' then coalesce(new.content_updated_at, now()) else now() end;
  elsif cls = 'pipeline' then
    new.content_updated_at := coalesce(new.content_updated_at, old.content_updated_at);
  elsif (new.description_original, new.features_original, new.year, new.make, new.model, new.trim, new.price,
         new.original_price, new.mileage, new.image_url, new.images, new.status, new.owner_hidden, new.exterior_color,
         new.interior_color, new.fuel_type, new.transmission, new.drivetrain, new.location, new.location_zh, new.lat,
         new.lng, new.phone, new.carfax_summary, new.carfax_url, new.source_url, new.vin)
        is distinct from
        (old.description_original, old.features_original, old.year, old.make, old.model, old.trim, old.price,
         old.original_price, old.mileage, old.image_url, old.images, old.status, old.owner_hidden, old.exterior_color,
         old.interior_color, old.fuel_type, old.transmission, old.drivetrain, old.location, old.location_zh, old.lat,
         old.lng, old.phone, old.carfax_summary, old.carfax_url, old.source_url, old.vin) then
    new.content_updated_at := now();
  else
    new.content_updated_at := old.content_updated_at;
  end if;

  -- (3) B10: moderation/admin removals cannot be undone by owners, claimants, sync or API v1
  if tg_op = 'INSERT' then
    new.removal_reason := case when new.status = 'removed' then 'other' end;
  elsif new.status is distinct from old.status then
    if new.status = 'removed' then
      new.removal_reason := case
        when cls = 'pipeline' then coalesce(nullif(current_setting('i18n.removal_reason', true), ''), 'moderation')
        when cls = 'admin' then 'admin' else 'other' end;
    elsif old.status = 'removed' and old.removal_reason in ('moderation','admin')
          and cls not in ('admin','pipeline','system') then
      if cls in ('user','anon') then
        raise exception 'listing_blocked' using errcode = 'P0001',
          hint = 'This listing was removed by moderation or an administrator';
      end if;
      new.status := old.status;               -- service writers (sync / API v1): silently stay removed
      new.removal_reason := old.removal_reason;
    else
      new.removal_reason := null;
    end if;
  elsif cls not in ('pipeline','system') then
    new.removal_reason := old.removal_reason;          -- trigger-owned; only pipeline / SQL editor may set it
  end if;

  if not v_enforce then
    return new;
  end if;

  -- (4) Enforce mode: compat projections are pipeline-owned; other_i18n is frozen.
  if cls <> 'pipeline' then
    new.other_i18n := case when tg_op = 'INSERT' then '{}'::jsonb else old.other_i18n end;
    if tg_op = 'INSERT' or new.description_original is distinct from old.description_original then
      new.description := new.description_original;      -- until the pipeline projects real zh/en text
      new.description_zh := new.description_original;
    else
      new.description := old.description;
      new.description_zh := old.description_zh;
    end if;
  end if;
  new.features := i18n.project_features(new.features_original);
  new.title := i18n.car_title(new.year, new.make, new.model, new.trim, 'en');
  new.title_zh := i18n.car_title(new.year, new.make, new.model, new.trim, 'zh');
  return new;
end $$;

create or replace function i18n.posts_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cls text := i18n.writer_class();
begin
  new.tags := i18n.clean_tags(new.tags, 10, 40);
  if tg_op = 'INSERT' then
    new.content_updated_at := case when cls = 'pipeline' then coalesce(new.content_updated_at, now()) else now() end;
  elsif cls = 'pipeline' then
    new.content_updated_at := coalesce(new.content_updated_at, old.content_updated_at);
  elsif (new.title, new.content, new.tags, new.images, new.make, new.model, new.year, new.status)
        is distinct from (old.title, old.content, old.tags, old.images, old.make, old.model, old.year, old.status) then
    new.content_updated_at := now();
  else
    new.content_updated_at := old.content_updated_at;
  end if;
  if i18n.setting_bool('enforce') and cls <> 'pipeline' then
    new.other_i18n := case when tg_op = 'INSERT' then '{}'::jsonb else old.other_i18n end;
  end if;
  return new;
end $$;

-- comments / post_comments / qa_questions / qa_answers / dealer_reviews:
-- status is moderation-owned (owners cannot unblock); legacy other_i18n frozen;
-- post_comments: legacy '回复 @name：' prefixes (old builds) move into reply_to_* columns. reply_to_name is shown
-- before the comment and is not moderated, so it is only ever a real username, never client text: the username of
-- the reply target (reply_to_user_id, else the latest commenter of the thread with the prefix's name). A prefix
-- moves out of the content only when its name IS that username; any other prefix stays in the (moderated)
-- content. No target -> NULL. An UPDATE keeps the stored name unless its content carries a matching prefix again.
create or replace function i18n.ugc_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cls text := i18n.writer_class();
  v_content text;
  v_name text;
  v_rest text;
  v_uid uuid;
  v_target_name text;
begin
  if tg_op = 'UPDATE' and cls in ('user','anon') then
    if to_jsonb(new) ? 'status' and (to_jsonb(new) ->> 'status') is distinct from (to_jsonb(old) ->> 'status') then
      new := jsonb_populate_record(new, jsonb_build_object('status', to_jsonb(old) ->> 'status'));
    end if;
  end if;
  if i18n.setting_bool('enforce') and cls <> 'pipeline' and to_jsonb(new) ? 'other_i18n' then
    new := jsonb_populate_record(new, jsonb_build_object('other_i18n',
             case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) -> 'other_i18n' end));
  end if;
  if tg_table_name = 'post_comments' and cls <> 'pipeline' then
    v_content := to_jsonb(new) ->> 'content';
    v_uid := (to_jsonb(new) ->> 'reply_to_user_id')::uuid;
    -- an UPDATE that leaves the content alone (counters, status) never re-parses it
    if tg_op = 'INSERT' or v_content is distinct from to_jsonb(old) ->> 'content' then
      v_name := substring(v_content from '^回复 @([^：:' || E'\n' || ']{1,40})[：:]');
    end if;
    if v_name is not null then
      v_rest := btrim(regexp_replace(v_content, '^回复 @[^：:' || E'\n' || ']{1,40}[：:][[:space:]]*', ''));
      if v_uid is null and v_rest <> '' then
        select pc.user_id into v_uid
          from public.post_comments pc join public.profiles pr on pr.id = pc.user_id
         where pc.post_id = (to_jsonb(new) ->> 'post_id')::uuid
           and pc.id is distinct from (to_jsonb(new) ->> 'id')::uuid and pr.username = v_name
         order by pc.created_at desc limit 1;
      end if;
    end if;
    v_target_name := (select pr.username from public.profiles pr where pr.id = v_uid);
    if v_name is not null and v_rest <> '' and v_target_name = v_name then
      new := jsonb_populate_record(new, jsonb_build_object(
        'content', v_rest, 'reply_to_name', v_name, 'reply_to_user_id', v_uid::text));
    elsif tg_op = 'INSERT' then
      new := jsonb_populate_record(new, jsonb_build_object('reply_to_name', left(v_target_name, 40)));
    else
      new := jsonb_populate_record(new, jsonb_build_object('reply_to_name', to_jsonb(old) ->> 'reply_to_name'));
    end if;
  end if;
  return new;
end $$;

-- ai_moderation rows can only be CREATED by the pipeline (or a direct DB session); admins may only review.
-- Old /api/moderate + lib/api/process.ts upsert as service_role -> raise -> they fail open (pass), as today.
create or replace function i18n.ai_moderation_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cls text := i18n.writer_class();
begin
  if cls in ('pipeline','system') then return new; end if;
  if tg_op = 'UPDATE' and cls = 'admin'
     and (new.target_type, new.target_id, new.user_id, new.content, new.categories, new.reason, new.model, new.created_at,
          new.context)
         is not distinct from
         (old.target_type, old.target_id, old.user_id, old.content, old.categories, old.reason, old.model, old.created_at,
          old.context) then
    return new;   -- review only: status / reviewed_at / reviewed_by
  end if;
  raise exception 'ai_moderation_pipeline_only' using errcode = '42501';
end $$;

-- ---------- 8. AFTER triggers: invalidation + queue (fire for EVERY writer) ----------
create or replace function i18n.cars_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_public boolean := new.status = 'active' and not new.owner_hidden;
  -- Trust is decided by WHO wrote the text, not by a column the row carries: only sync / scripts / the
  -- pipeline writing a syndicated car (source_id set, held by that source's system account) skip moderation.
  -- Owner, claimant and admin edits of a syndicated car are moderated like any user content (critic gap:
  -- source_id self-assignment bypass), and so is a user car that somehow holds a sync slot.
  v_trusted boolean := new.source_id is not null and i18n.writer_class() in ('service','system','pipeline')
    and exists (select 1 from public.listing_sources ls where ls.id = new.source_id and ls.system_account_id = new.seller_id);
begin
  perform i18n.sync_source('car', new.id, v_public, v_trusted, 0::smallint);
  if tg_op = 'INSERT' or new.features_original is distinct from old.features_original then
    perform i18n.sync_car_features(new.id, new.features_original);
  end if;
  if tg_op = 'UPDATE' and (new.status, new.owner_hidden) is distinct from (old.status, old.owner_hidden) then
    perform i18n.set_public('car', array[new.id], v_public);
    perform i18n.set_public('car_comment',
      array(select x.id from public.comments x where x.car_id = new.id and x.status = 'active'), v_public);
  end if;
  return null;
end $$;

create or replace function i18n.posts_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_public boolean := new.status = 'active';
begin
  perform i18n.sync_source('post', new.id, v_public, false, 0::smallint);
  if tg_op = 'INSERT' or (new.tags, new.title, new.content) is distinct from (old.tags, old.title, old.content) then
    perform i18n.sync_post_tags(new.id, new.tags, new.title, new.content);
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform i18n.set_public('post', array[new.id], v_public);
    perform i18n.set_public('post_comment',
      array(select x.id from public.post_comments x where x.post_id = new.id and x.status = 'active'), v_public);
  end if;
  return null;
end $$;

create or replace function i18n.ugc_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_entity text := tg_argv[0];
  v_public boolean := i18n.entity_is_public(v_entity, new.id);
begin
  perform i18n.sync_source(v_entity, new.id, v_public, false, 0::smallint);
  if tg_op = 'UPDATE' and (to_jsonb(new) ->> 'status') is distinct from (to_jsonb(old) ->> 'status') then
    perform i18n.set_public(v_entity, array[new.id], v_public);
    if v_entity = 'qa_question' then
      perform i18n.set_public('qa_answer',
        array(select a.id from public.qa_answers a where a.question_id = new.id and a.status = 'active'), v_public);
    end if;
  end if;
  return null;
end $$;

drop trigger if exists i18n_legacy_map on public.cars;     -- emergency mapper from i18n-v2-rollback.sql
drop trigger if exists i18n_guard_ins on public.cars;
create trigger i18n_guard_ins before insert on public.cars for each row execute function i18n.cars_before();
drop trigger if exists i18n_guard_upd on public.cars;
-- Fires for every column cars_before guards or clocks: originals, projections, trigger-owned columns, the
-- content-clock tuple and the source identity columns (an identity-only UPDATE must still be coerced).
create trigger i18n_guard_upd before update on public.cars for each row
  when ((old.description, old.description_zh, old.description_original, old.features, old.features_original,
         old.other_i18n, old.content_updated_at, old.removal_reason, old.original_uncertain, old.status, old.owner_hidden,
         old.title, old.title_zh, old.year, old.make, old.model, old.trim, old.price, old.original_price, old.mileage,
         old.image_url, old.images, old.exterior_color, old.interior_color, old.fuel_type, old.transmission,
         old.drivetrain, old.location, old.location_zh, old.lat, old.lng, old.phone, old.carfax_summary, old.carfax_url,
         old.source_url, old.vin, old.source_id, old.source_listing_id, old.api_key_id, old.external_id)
        is distinct from
        (new.description, new.description_zh, new.description_original, new.features, new.features_original,
         new.other_i18n, new.content_updated_at, new.removal_reason, new.original_uncertain, new.status, new.owner_hidden,
         new.title, new.title_zh, new.year, new.make, new.model, new.trim, new.price, new.original_price, new.mileage,
         new.image_url, new.images, new.exterior_color, new.interior_color, new.fuel_type, new.transmission,
         new.drivetrain, new.location, new.location_zh, new.lat, new.lng, new.phone, new.carfax_summary, new.carfax_url,
         new.source_url, new.vin, new.source_id, new.source_listing_id, new.api_key_id, new.external_id))
  execute function i18n.cars_before();
drop trigger if exists i18n_sync_ins on public.cars;
create trigger i18n_sync_ins after insert on public.cars for each row execute function i18n.cars_after();
drop trigger if exists i18n_sync_upd on public.cars;
-- make / model / trim are moderated text (deterministic title), so they re-key moderation (mod_hash)
create trigger i18n_sync_upd after update on public.cars for each row
  when ((old.description_original, old.features_original, old.make, old.model, old.trim, old.status, old.owner_hidden,
         old.source_id)
        is distinct from (new.description_original, new.features_original, new.make, new.model, new.trim, new.status,
                          new.owner_hidden, new.source_id))
  execute function i18n.cars_after();

drop trigger if exists i18n_guard on public.community_posts;
create trigger i18n_guard before insert or update on public.community_posts for each row
  execute function i18n.posts_before();
drop trigger if exists i18n_sync on public.community_posts;
create trigger i18n_sync after insert or update of title, content, tags, status on public.community_posts
  for each row execute function i18n.posts_after();

do $$
declare r record;
begin
  for r in select * from (values ('post_comments','post_comment'), ('comments','car_comment'),
                                 ('qa_questions','qa_question'), ('qa_answers','qa_answer'),
                                 ('dealer_reviews','dealer_review')) as v(tbl, ent) loop
    execute format('drop trigger if exists i18n_guard on public.%I', r.tbl);
    execute format('create trigger i18n_guard before insert or update on public.%I for each row execute function i18n.ugc_before()', r.tbl);
    execute format('drop trigger if exists i18n_sync on public.%I', r.tbl);
    execute format('create trigger i18n_sync after insert or update on public.%I for each row execute function i18n.ugc_after(%L)', r.tbl, r.ent);
  end loop;
end $$;
-- ugc_after is cheap when nothing translatable changed (sync_source compares hashes); counter updates
-- (likes_count, answers_count) cost one hash comparison.

drop trigger if exists i18n_guard on public.ai_moderation;
create trigger i18n_guard before insert or update on public.ai_moderation
  for each row execute function i18n.ai_moderation_guard();

-- ---------- 9. Consistency sweep (hourly pg_cron): repairs trigger-bypassing writes and term projections ----------
-- Repairs rows written while the triggers were bypassed (bulk loads, the emergency-detach window, where browser
-- users write too). Such text is never trusted here: only the one-time data migration passes p_trust_syndicated
-- (i18n-v2-data.sql step 6), and even then only for a car held by its source's system account.
drop function if exists i18n.sweep(int);
create or replace function i18n.sweep(p_limit int default 5000, p_trust_syndicated boolean default false) returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0; r record;
begin
  for r in
    -- drift = translation payload (src_hash) or moderation payload (mod_hash) differs from the stored key;
    -- entities whose moderation payload is their translation payload have mod_hash = src_hash
    select 'car'::text e, c.id, (c.status = 'active' and not c.owner_hidden) pub,
           (p_trust_syndicated and c.source_id is not null
            and exists (select 1 from public.listing_sources ls
                         where ls.id = c.source_id and ls.system_account_id = c.seller_id)) md
      from public.cars c left join i18n.sources s on s.entity = 'car' and s.entity_id = c.id
     where s.src_hash is distinct from i18n.hash_payload(i18n.payload_of('car', c.id))
        or s.mod_hash is distinct from i18n.hash_payload(i18n.moderation_payload('car', c.id))
    union all
    select 'post', p.id, p.status = 'active', false from public.community_posts p
      left join i18n.sources s on s.entity = 'post' and s.entity_id = p.id
     where s.src_hash is distinct from i18n.hash_payload(i18n.payload_of('post', p.id))
        or s.mod_hash is distinct from i18n.hash_payload(i18n.moderation_payload('post', p.id))
    union all
    select 'post_comment', x.id, i18n.entity_is_public('post_comment', x.id), false from public.post_comments x
      left join i18n.sources s on s.entity = 'post_comment' and s.entity_id = x.id
     where s.src_hash is distinct from i18n.hash_payload(i18n.payload_of('post_comment', x.id))
        or s.mod_hash is distinct from s.src_hash
    union all
    select 'car_comment', x.id, i18n.entity_is_public('car_comment', x.id), false from public.comments x
      left join i18n.sources s on s.entity = 'car_comment' and s.entity_id = x.id
     where s.src_hash is distinct from i18n.hash_payload(i18n.payload_of('car_comment', x.id))
        or s.mod_hash is distinct from s.src_hash
    union all
    select 'qa_question', x.id, coalesce(x.status, 'active') = 'active', false from public.qa_questions x
      left join i18n.sources s on s.entity = 'qa_question' and s.entity_id = x.id
     where s.src_hash is distinct from i18n.hash_payload(i18n.payload_of('qa_question', x.id))
        or s.mod_hash is distinct from i18n.hash_payload(i18n.moderation_payload('qa_question', x.id))
    union all
    select 'qa_answer', x.id, i18n.entity_is_public('qa_answer', x.id), false from public.qa_answers x
      left join i18n.sources s on s.entity = 'qa_answer' and s.entity_id = x.id
     where s.src_hash is distinct from i18n.hash_payload(i18n.payload_of('qa_answer', x.id))
        or s.mod_hash is distinct from s.src_hash
    union all
    select 'dealer_review', x.id, x.status = 'active', false from public.dealer_reviews x
      left join i18n.sources s on s.entity = 'dealer_review' and s.entity_id = x.id
     where s.src_hash is distinct from i18n.hash_payload(i18n.payload_of('dealer_review', x.id))
        or s.mod_hash is distinct from s.src_hash
    limit p_limit
  loop
    perform i18n.sync_source(r.e, r.id, r.pub, r.md, 3::smallint);
    n := n + 1;
  end loop;
  -- link rows whose alias set differs from the originals (rows that predate the triggers, bulk loads with triggers
  -- disabled, feature / tag edits made while detached)
  perform i18n.sync_car_features(c.id, c.features_original) from public.cars c
   where array(select distinct i18n.norm_tag(x) from unnest(c.features_original) as x
                where i18n.norm_tag(x) is not null order by 1)
         is distinct from array(select f.alias_norm from i18n.car_features f where f.car_id = c.id order by 1);
  perform i18n.sync_post_tags(p.id, p.tags, p.title, p.content) from public.community_posts p
   where i18n.post_tag_norms(p.tags, p.title, p.content)
         is distinct from array(select t.alias_norm from i18n.post_tags t where t.post_id = p.id order by t.pos);
  -- parked refresh rows of entities that became public through a trigger-bypassing write resume
  update i18n.translations t set next_attempt_at = now(), updated_at = now()
   where t.state = 'ok' and t.refresh and t.next_attempt_at = 'infinity' and i18n.entity_is_public(t.entity, t.entity_id);
  -- feature/title projections skipped by complete_term's SKIP LOCKED (enforce mode only)
  perform i18n.reproject_cars(500, false);
  return n;
end $$;

-- ---------- 10. Budget ----------
-- Two daily breakers: translation work (claims, glossary, detection) and moderation. Exhausting the translation
-- cap never stops moderation (i18n_moderation_queue / i18n_budget_state), and vice versa.
create or replace function i18n.budget_exhausted() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select calls from i18n.budget where day = (now() at time zone 'utc')::date), 0)
         >= coalesce(i18n.setting_int('daily_call_cap'), 20000)
$$;
create or replace function i18n.moderation_budget_exhausted() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select mod_calls from i18n.budget where day = (now() at time zone 'utc')::date), 0)
         >= coalesce(i18n.setting_int('daily_moderation_cap'), 20000)
$$;
-- Per-author breaker: today's moderation verdicts for content owned by p_user reached the per-author cap
-- (NULL owner: never). Such content keeps its unsettled verdict: i18n_moderation_input hides its mod_hash (the
-- caller then spends nothing), i18n_moderation_queue skips it and i18n_claim defers its translations to the next
-- UTC day, when the queue moderates it like any other backlog.
create or replace function i18n.moderation_author_throttled(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user is not null
     and coalesce((select b.verdicts from i18n.mod_author_budget b
                    where b.day = (now() at time zone 'utc')::date and b.user_id = p_user), 0)
         >= coalesce(i18n.setting_int('daily_moderation_cap_per_author'), 200)
$$;
drop function if exists i18n.budget_add(int, bigint, bigint);
create or replace function i18n.budget_add(p_calls int, p_in bigint, p_out bigint, p_mod_calls int default 0) returns void
language sql security definer set search_path = '' as $$
  insert into i18n.budget (day, calls, in_tokens, out_tokens, mod_calls)
  values ((now() at time zone 'utc')::date, greatest(p_calls, 0), greatest(p_in, 0), greatest(p_out, 0),
          greatest(p_mod_calls, 0))
  on conflict (day) do update set calls = i18n.budget.calls + excluded.calls,
    in_tokens = i18n.budget.in_tokens + excluded.in_tokens, out_tokens = i18n.budget.out_tokens + excluded.out_tokens,
    mod_calls = i18n.budget.mod_calls + excluded.mod_calls
$$;

-- ---------- 11. Read model (one rule set for bundle state, availability, hreflang and sitemaps) ----------
-- Per-locale state of one entity:
--   ok          validated translation for the current source hash
--   source      nothing to translate for this locale (every field is in this language or 'und')
--   pending     work outstanding (pending/failed/leased/hold, or source language not detected yet)
--   unavailable gave up for this source version (dead / rejected) -> show original
create or replace function i18n.locale_states(p_entity text, p_id uuid)
returns table (locale text, s text, fields jsonb, source_lang text, translated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.locale,
    case
      when src.src_hash = i18n.hash_payload('{}'::jsonb) then 'source'
      when t.state = 'ok' and t.src_hash = src.src_hash then 'ok'
      when src.detected_hash = src.src_hash and not exists (
             select 1 from jsonb_each_text(coalesce(src.field_langs, '{}'::jsonb)) fl
             where fl.value not in (l.locale, 'und')) then 'source'
      when t.state = 'skipped' and t.src_hash = src.src_hash then 'source'
      when t.state in ('dead','rejected') and t.src_hash = src.src_hash then 'unavailable'
      else 'pending' end,
    case when t.state = 'ok' and t.src_hash = src.src_hash then t.fields end,
    case when t.state = 'ok' and t.src_hash = src.src_hash then t.source_lang end,
    case when t.state = 'ok' and t.src_hash = src.src_hash then t.translated_at end
  from i18n.sources src
  cross join unnest(array['zh','en','ko','ja','es','fr']) with ordinality as l(locale, ord)
  left join i18n.translations t on t.entity = src.entity and t.entity_id = src.entity_id and t.locale = l.locale
  where src.entity = p_entity and src.entity_id = p_id
  order by l.ord
$$;

-- Locales whose page is fully localized (state ok|source). NULL = source language not detected yet
-- (readers fall back to lib/i18n/detect.ts on the original for that short window).
-- The source-language locale (primary_lang) is always included once detected (provisionally or not): it is
-- 'source' by construction for single-language text, and for text whose fields are in two languages (English
-- title, Chinese body) that page shows the original, so it stays self-canonical and in the sitemaps while the
-- other field waits for the pipeline (lib/i18n/content/resolve.ts applies the same rule before detection).
create or replace function i18n.available_locales(p_entity text, p_id uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select case
    when s.src_hash = i18n.hash_payload('{}'::jsonb) then array['zh','en','ko','ja','es','fr']
    when s.detected_hash is distinct from s.src_hash then null
    else array(select ls.locale from i18n.locale_states(p_entity, p_id) ls
                where ls.s in ('ok','source') or ls.locale = s.primary_lang) end
  from i18n.sources s where s.entity = p_entity and s.entity_id = p_id
$$;

create or replace function i18n.bundle_extra(p_entity text, p_id uuid, p_locale text) returns jsonb
language sql stable security definer set search_path = '' as $$
  -- label rule (R4 + critic gap 4d): unresolved tag -> verbatim; tag already written in the UI language
  -- (alias.lang = p_locale) -> verbatim; otherwise the resolved topic/feature label for p_locale.
  select case p_entity
    when 'post' then (
      select jsonb_build_object('topics', coalesce(jsonb_agg(jsonb_build_object(
               'raw', pt.raw, 'norm', pt.alias_norm, 'slug', tm.slug,
               'label', case when tm.id is null or a.lang = p_locale then pt.raw
                             else coalesce(tm.labels ->> p_locale, tm.labels ->> 'en', pt.raw) end) order by pt.pos), '[]'::jsonb))
      from i18n.post_tags pt
      left join i18n.term_aliases a on a.kind = 'topic' and a.alias_norm = pt.alias_norm and a.state = 'ok'
      left join i18n.terms t0 on t0.id = a.term_id
      left join i18n.terms tm on tm.id = coalesce(t0.merged_into, t0.id)
      where pt.post_id = p_id)
    when 'car' then (
      select jsonb_build_object('features', coalesce(jsonb_agg(jsonb_build_object(
               'raw', d.raw, 'key', d.k, 'label', d.label) order by d.pos), '[]'::jsonb))
      from (
        -- one chip per term (language twins collapse); prefer the seller's own spelling in the UI language
        select distinct on (coalesce('t:' || tm.slug, 'r:' || cf.alias_norm))
               coalesce('t:' || tm.slug, 'r:' || cf.alias_norm) as k, cf.raw, cf.pos,
               case when tm.id is null or a.lang = p_locale then cf.raw
                    else coalesce(tm.labels ->> p_locale, tm.labels ->> 'en', cf.raw) end as label
        from i18n.car_features cf
        left join i18n.term_aliases a on a.kind = 'feature' and a.alias_norm = cf.alias_norm and a.state = 'ok'
        left join i18n.terms t0 on t0.id = a.term_id
        left join i18n.terms tm on tm.id = coalesce(t0.merged_into, t0.id)
        where cf.car_id = p_id
        order by coalesce('t:' || tm.slug, 'r:' || cf.alias_norm), (a.lang is not distinct from p_locale) desc, cf.pos
      ) d)
    else null end
$$;

-- Batched read for SSR, web clients and native (anon). Non-public / unknown ids are omitted.
-- Bad input (unknown entity/locale, > 200 ids) returns no rows.
--   s  = ok | source | pending | unavailable for p_locale (i18n.locale_states)
--   sl = language the shown translation was made from ("Translated from X" label)
--   pl = primary source language (longest non-und field) once detected: sourceLocale / x-default (same as sitemaps)
drop function if exists public.i18n_bundle(text, uuid[], text);
create or replace function public.i18n_bundle(p_entity text, p_ids uuid[], p_locale text)
returns table (id uuid, s text, h text, f jsonb, sl text, pl text, fl jsonb, ta timestamptz, al text[], x jsonb)
language sql stable security definer set search_path = '' as $$
  select src.entity_id, ls.s, src.src_hash, ls.fields,
    coalesce(ls.source_lang, case when src.detected_hash = src.src_hash then src.primary_lang end),
    case when src.detected_hash = src.src_hash then src.primary_lang end,
    case when src.detected_hash = src.src_hash then src.field_langs end,
    ls.translated_at,
    i18n.available_locales(src.entity, src.entity_id),
    i18n.bundle_extra(p_entity, src.entity_id, p_locale)
  from (select distinct u.id as rid from unnest(p_ids) as u(id)) req
  join i18n.sources src on src.entity = p_entity and src.entity_id = req.rid
  join lateral (select * from i18n.locale_states(p_entity, req.rid) x where x.locale = p_locale) ls on true
  where p_entity in ('car','post','post_comment','car_comment','qa_question','qa_answer','dealer_review')
    and p_locale in ('zh','en','ko','ja','es','fr')
    and cardinality(p_ids) <= 200
    and i18n.entity_is_public(p_entity, src.entity_id)
$$;

-- Localized labels for raw tags (filter facets, map facets, compare, composer suggestions)
create or replace function public.i18n_term_labels(p_kind text, p_raws text[], p_locale text)
returns table (raw text, key text, label text)
language sql stable security definer set search_path = '' as $$
  select r, coalesce('t:' || tm.slug, 'r:' || i18n.norm_tag(r)),
         case when tm.id is null or a.lang = p_locale then r
              else coalesce(tm.labels ->> p_locale, tm.labels ->> 'en', r) end
  from unnest((coalesce(p_raws, '{}'))[1:100]) as r
  left join i18n.term_aliases a on a.kind = p_kind and a.alias_norm = i18n.norm_tag(r) and a.state = 'ok'
  left join i18n.terms t0 on t0.id = a.term_id
  left join i18n.terms tm on tm.id = coalesce(t0.merged_into, t0.id)
  where p_kind in ('topic','feature') and p_locale in ('zh','en','ko','ja','es','fr') and i18n.norm_tag(r) is not null
$$;

-- Same normalization as i18n.norm_tag and lib/i18n/hashtags.ts normTag. The body is INLINED on purpose:
-- anon/authenticated have no USAGE on schema i18n, so delegating to i18n.norm_tag fails with
-- "permission denied for schema i18n" (scripts/i18n-db-test.ts checks anon parity + equality with i18n.norm_tag).
create or replace function public.i18n_norm_tag(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select nullif(left(lower(regexp_replace(normalize(regexp_replace(regexp_replace(coalesce(p, ''),
           '^[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+|[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$', '', 'g'),
           '^[#＃]+', ''), NFKC),
         '[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff_.·・\-]+', '', 'g')), 80), '')
$$;

-- Cross-language topic + escaped full-text search (replaces the unescaped PostgREST .or() filter).
--   p_topic = slug                     -> posts linked to that topic (any alias, any language)
--   p_q = '#tag' / '＃tag'              -> the exact alias in any language, plus every topic whose label in any
--                                         locale is this spelling (#테슬라 = #tesla = #特斯拉 = #テスラ)
--   other p_q                          -> LIKE-escaped over originals, ok translations (any locale), resolved
--                                         topic labels, and raw tags (normalized) even before they are resolved
-- Filters stack: p_topic, the '#tag' and free text must all match (a tag chip under an active topic narrows it).
-- Labels only WIDEN discovery; they never re-label or re-link another post's tags.
-- setof community_posts => PostgREST embedding (profiles!user_id) works on the result.
create or replace function public.search_posts(
  p_q text default null, p_type text default null, p_topic text default null,
  p_offset int default 0, p_limit int default 20
) returns setof public.community_posts
language plpgsql stable security definer set search_path = '' as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_tag text;
  v_topic_terms bigint[];
  v_tag_terms bigint[];
  v_like text;
  v_qnorm text;
begin
  if v_q is not null and left(v_q, 1) in ('#', '＃') then
    v_tag := i18n.norm_tag(v_q);
    v_q := null;
    if v_tag is null then return; end if;
  end if;
  if p_topic is not null then
    select array_agg(distinct coalesce(t.merged_into, t.id)) into v_topic_terms
      from i18n.terms t where t.kind = 'topic' and t.slug = p_topic;
    if v_topic_terms is null then return; end if;
  end if;
  if v_tag is not null then
    select array_agg(distinct x.tid) into v_tag_terms from (
      select coalesce(t.merged_into, t.id) as tid
        from i18n.term_aliases a join i18n.terms t on t.id = a.term_id
       where a.kind = 'topic' and a.alias_norm = v_tag and a.state = 'ok'
      union
      select coalesce(t.merged_into, t.id)
        from i18n.terms t
       where t.kind = 'topic'
         and exists (select 1 from jsonb_each_text(t.labels) lb where i18n.norm_tag(lb.value) = v_tag)
    ) x;
  end if;
  if v_q is not null then
    v_like := '%' || replace(replace(replace(left(v_q, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
    v_qnorm := i18n.norm_tag(v_q);
  end if;
  return query
  select p.* from public.community_posts p
  where p.status = 'active'
    and (p_type is null or p.type = p_type)
    and (v_topic_terms is null or exists (
          select 1 from i18n.post_tags pt
          join i18n.term_aliases a on a.kind = 'topic' and a.alias_norm = pt.alias_norm and a.state = 'ok'
          join i18n.terms t0 on t0.id = a.term_id
          where pt.post_id = p.id and coalesce(t0.merged_into, t0.id) = any(v_topic_terms)))
    and (v_tag is null or exists (
          select 1 from i18n.post_tags pt
          left join i18n.term_aliases a on a.kind = 'topic' and a.alias_norm = pt.alias_norm and a.state = 'ok'
          left join i18n.terms t0 on t0.id = a.term_id
          where pt.post_id = p.id
            and (pt.alias_norm = v_tag or coalesce(t0.merged_into, t0.id) = any(v_tag_terms))))
    and (v_like is null
         or p.title ilike v_like escape '\' or p.content ilike v_like escape '\'
         or exists (select 1 from i18n.post_tags pt where pt.post_id = p.id and pt.alias_norm = v_qnorm)
         or exists (select 1 from i18n.translations t
                    join i18n.sources s on s.entity = t.entity and s.entity_id = t.entity_id and s.src_hash = t.src_hash
                    where t.entity = 'post' and t.entity_id = p.id and t.state = 'ok'
                      and ((t.fields ->> 'title') ilike v_like escape '\' or (t.fields ->> 'content') ilike v_like escape '\'))
         or exists (select 1 from i18n.post_tags pt
                    join i18n.term_aliases a on a.kind = 'topic' and a.alias_norm = pt.alias_norm and a.state = 'ok'
                    join i18n.terms t0 on t0.id = a.term_id
                    join i18n.terms tm on tm.id = coalesce(t0.merged_into, t0.id)
                    where pt.post_id = p.id
                      and exists (select 1 from jsonb_each_text(tm.labels) lb where lb.value ilike v_like escape '\')))
  order by p.created_at desc, p.id desc
  offset greatest(coalesce(p_offset, 0), 0) limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

-- Topic hub data: null if unknown; canonical_slug != slug => 308 to the merge target
create or replace function public.topic_get(p_slug text, p_locale text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', t.slug,
    'canonical_slug', r.slug,
    'labels', r.labels,
    'label', coalesce(r.labels ->> p_locale, r.labels ->> 'en', r.slug),
    'post_count', (select count(distinct p.id)
                     from i18n.terms t0
                     join i18n.term_aliases a on a.term_id = t0.id and a.kind = 'topic' and a.state = 'ok'
                     join i18n.post_tags pt on pt.alias_norm = a.alias_norm
                     join public.community_posts p on p.id = pt.post_id and p.status = 'active'
                    where coalesce(t0.merged_into, t0.id) = r.id))
  from i18n.terms t
  join i18n.terms r on r.id = coalesce(t.merged_into, t.id)
  where t.kind = 'topic' and t.slug = p_slug
$$;

-- ---------- 12. Sitemaps (service role ONLY: no anon full-table scans; PostgREST max-rows = 1000) ----------
-- Same availability rule as the page's hreflang (i18n.available_locales); lastmod per locale.
-- kinds: car | post | qa (qa_question) | user | topic. Shards are 1000 URLs = one RPC page (lib/sitemap.ts).
create or replace function i18n.sitemap_rows(p_kind text, p_locale text)
returns table (id text, lastmod timestamptz, locales text[], x_default text)
language sql stable security definer set search_path = '' as $$
  with ent as (
    select c.id, c.content_updated_at as cu, 'car'::text as e from public.cars c
     where p_kind = 'car' and c.status = 'active' and not c.owner_hidden
    union all
    -- posts and Q&A pages SSR their (first) comments / answers: a new one is a content change of the page
    select p.id, greatest(p.content_updated_at,
             (select max(pc.created_at) from public.post_comments pc where pc.post_id = p.id and pc.status = 'active')),
           'post'
      from public.community_posts p where p_kind = 'post' and p.status = 'active'
    union all
    select q.id, greatest(q.updated_at,
             (select max(a.created_at) from public.qa_answers a where a.question_id = q.id and a.status = 'active')),
           'qa_question'
      from public.qa_questions q where p_kind = 'qa' and coalesce(q.status, 'active') = 'active'
  ), av as (
    select ent.id, ent.cu, ent.e, i18n.available_locales(ent.e, ent.id) as al,
           (select s.primary_lang from i18n.sources s where s.entity = ent.e and s.entity_id = ent.id
              and s.detected_hash = s.src_hash) as pl
    from ent
  )
  select av.id::text,
         greatest(coalesce(av.cu, now()),
                  coalesce((select t.translated_at from i18n.translations t where t.entity = av.e and t.entity_id = av.id
                              and t.locale = p_locale and t.state = 'ok'), av.cu)),
         av.al,
         case when av.pl = any(av.al) then av.pl when 'zh' = any(av.al) then 'zh'
              when 'en' = any(av.al) then 'en' else av.al[1] end
  from av where av.al is not null and p_locale = any(av.al)
  union all
  select u.id::text, max(u.lm), array['zh','en','ko','ja','es','fr'], 'zh'
  from (
    select c.seller_id as id, c.content_updated_at as lm from public.cars c
     where p_kind = 'user' and c.status = 'active' and not c.owner_hidden
    union all
    select p.user_id, p.content_updated_at from public.community_posts p where p_kind = 'user' and p.status = 'active'
  ) u join public.profiles pr on pr.id = u.id and not pr.banned
  group by u.id
  union all
  select tm.slug, max(p.content_updated_at),
         array(select l from unnest(array['zh','en','ko','ja','es','fr']) l where tm.labels ? l), 'zh'
  from i18n.terms tm
  join i18n.terms t0 on coalesce(t0.merged_into, t0.id) = tm.id
  join i18n.term_aliases a on a.term_id = t0.id and a.kind = 'topic' and a.state = 'ok'
  join i18n.post_tags pt on pt.alias_norm = a.alias_norm
  join public.community_posts p on p.id = pt.post_id and p.status = 'active'
  where p_kind = 'topic' and tm.kind = 'topic' and tm.merged_into is null and tm.labels ? p_locale
  group by tm.id, tm.slug, tm.labels
  having count(distinct p.id) >= 3
$$;

drop function if exists public.sitemap_counts(text);
create or replace function public.sitemap_counts(p_locale text)
returns table (kind text, n bigint)
language sql stable security definer set search_path = '' as $$
  select k, (select count(*) from i18n.sitemap_rows(k, p_locale))
  from unnest(array['car','post','qa','user','topic']) as k
  where p_locale in ('zh','en','ko','ja','es','fr')
$$;

-- One shard page: rows ordered by id, at most 1000 (= PostgREST max-rows; a larger p_limit is clamped).
drop function if exists public.sitemap_entries(text, text, int, int);
create or replace function public.sitemap_entries(p_kind text, p_locale text, p_offset int default 0, p_limit int default 1000)
returns table (id text, lastmod timestamptz, locales text[], x_default text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.lastmod, r.locales, r.x_default from i18n.sitemap_rows(p_kind, p_locale) r
  where p_kind in ('car','post','qa','user','topic') and p_locale in ('zh','en','ko','ja','es','fr')
  order by r.id
  offset greatest(coalesce(p_offset, 0), 0) limit least(greatest(coalesce(p_limit, 1000), 1), 1000)
$$;

-- ---------- 13. Pipeline RPCs (service_role only) ----------
-- Claim due work per entity: locks the source row (SKIP LOCKED), leases every due locale row of that
-- entity (optionally only p_locales) with one random token. Attempts are consumed at claim time.
-- mod_hash = the verdict key to pass to i18n_record_moderation when needs_moderation.
drop function if exists public.i18n_claim(int, int, text, uuid[], text[]);
create or replace function public.i18n_claim(
  p_max_entities int default 6, p_lease_seconds int default 120,
  p_entity text default null, p_entity_ids uuid[] default null, p_locales text[] default null
) returns table (entity text, entity_id uuid, src_hash text, payload jsonb, field_langs jsonb,
                 needs_moderation boolean, locales text[], lease_token uuid, attempts int,
                 en_fields jsonb, meta jsonb, mod_hash text)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  r record;
  v_src i18n.sources%rowtype;
  v_token uuid;
  v_payload jsonb;
  v_taken int := 0;
  v_cap int := least(greatest(coalesce(p_max_entities, 6), 1), 50);
  v_max int := coalesce(i18n.setting_int('max_attempts'), 6);
  v_mod_out boolean := coalesce(i18n.setting_text('moderate_outputs'), 'true')::boolean;
begin
  perform set_config('i18n.writer', 'pipeline', true);
  if i18n.budget_exhausted() then return; end if;
  for r in
    select t.entity as e, t.entity_id as id, min(t.priority) as pr, min(t.next_attempt_at) as na
      from i18n.translations t
     where (t.state in ('pending','failed') or (t.state = 'ok' and t.refresh))
       and t.next_attempt_at <= now()
       and (t.lease_until is null or t.lease_until < now())
       and (p_entity is null or t.entity = p_entity)
       and (p_entity_ids is null or t.entity_id = any(p_entity_ids))
       and (p_locales is null or t.locale = any(p_locales))
     group by t.entity, t.entity_id
     order by pr, na
     limit v_cap * 4
  loop
    exit when v_taken >= v_cap;
    select * into v_src from i18n.sources s where s.entity = r.e and s.entity_id = r.id for update skip locked;
    continue when not found;
    if not i18n.entity_is_public(r.e, r.id) then
      -- hidden: queued rows wait in 'hold', refresh rows are parked (they must not head this window again)
      update i18n.translations t
         set state = case when t.state in ('pending','failed') then 'hold' else t.state end,
             next_attempt_at = case when t.state = 'ok' then 'infinity'::timestamptz else t.next_attempt_at end,
             updated_at = now()
       where t.entity = r.e and t.entity_id = r.id
         and (t.state in ('pending','failed') or (t.state = 'ok' and t.refresh));
      continue;
    end if;
    v_payload := i18n.payload_of(r.e, r.id);
    if v_payload is null then continue; end if;
    if i18n.hash_payload(v_payload) is distinct from v_src.src_hash
       or i18n.hash_payload(i18n.moderation_payload(r.e, r.id)) is distinct from v_src.mod_hash then
      -- self-heal (trigger bypass, e.g. the emergency-detach window): the drifted text was written outside the
      -- triggers, so its writer is unknown and it is never trusted
      perform i18n.sync_source(r.e, r.id, true, false, 0::smallint);
      continue;
    end if;
    -- moderation is due but the author's daily moderation allowance is used up: nothing is translated before a
    -- verdict, so the due rows wait for the next UTC day (attempts untouched; an edit re-queues them at once)
    if (v_src.moderation not in ('pass','flagged','blocked','skipped')
        or v_src.moderated_hash is distinct from v_src.mod_hash)
       and i18n.moderation_author_throttled(i18n.entity_owner(r.e, r.id)) then
      update i18n.translations t
         set next_attempt_at = ((now() at time zone 'utc')::date + 1)::timestamp at time zone 'utc', updated_at = now()
       where t.entity = r.e and t.entity_id = r.id
         and (t.state in ('pending','failed') or (t.state = 'ok' and t.refresh))
         and t.next_attempt_at <= now() and (t.lease_until is null or t.lease_until < now());
      continue;
    end if;
    -- exhausted rows die here instead of being leased again (crash loops consume attempts too)
    update i18n.translations t set state = 'dead', last_error = coalesce(t.last_error, 'max attempts'), updated_at = now()
     where t.entity = r.e and t.entity_id = r.id and t.state in ('pending','failed') and t.attempts >= v_max;
    v_token := gen_random_uuid();
    update i18n.translations t
       set lease_token = v_token, lease_until = now() + make_interval(secs => greatest(p_lease_seconds, 30)),
           attempts = t.attempts + 1, updated_at = now()
     where t.entity = r.e and t.entity_id = r.id
       and (t.state in ('pending','failed') or (t.state = 'ok' and t.refresh))
       and (p_locales is null or t.locale = any(p_locales))
       and t.next_attempt_at <= now() and (t.lease_until is null or t.lease_until < now());
    if not found then continue; end if;
    v_taken := v_taken + 1;
    entity := r.e; entity_id := r.id; src_hash := v_src.src_hash; payload := v_payload; mod_hash := v_src.mod_hash;
    -- a provisional (local best-guess) detection is refined by the worker's own detection
    field_langs := case when v_src.detected_hash = v_src.src_hash and not v_src.detect_provisional
                        then v_src.field_langs end;
    needs_moderation := v_src.moderation not in ('pass','flagged','blocked','skipped')
                        or v_src.moderated_hash is distinct from v_src.mod_hash;
    locales := array(select t.locale from i18n.translations t
                      where t.entity = r.e and t.entity_id = r.id and t.lease_token = v_token order by t.locale);
    lease_token := v_token;
    attempts := (select max(t.attempts) from i18n.translations t where t.entity = r.e and t.entity_id = r.id
                  and t.lease_token = v_token);
    en_fields := (select t.fields from i18n.translations t where t.entity = r.e and t.entity_id = r.id
                   and t.locale = 'en' and t.state = 'ok' and t.src_hash = v_src.src_hash and not t.refresh);
    -- trusted: skip output moderation (trusted syndication text only); moderate_outputs: i18n.settings switch,
    -- off for the version an admin restored after its output was rejected (sources.output_override_hash)
    meta := coalesce(case r.e when 'car' then (select jsonb_build_object('year', c.year, 'make', c.make, 'model', c.model,
                                                 'trim', c.trim) from public.cars c where c.id = r.id)
                              when 'post' then (select jsonb_build_object('make', p.make, 'model', p.model, 'type', p.type)
                                                 from public.community_posts p where p.id = r.id)
                     end, '{}'::jsonb)
            || jsonb_build_object('trusted', v_src.trusted,
                                  'moderate_outputs', v_mod_out and v_src.output_override_hash is distinct from v_src.src_hash);
    return next;
  end loop;
end $$;

-- p_results: [{"locale":"ko","outcome":"ok|skipped|failed|rejected|retry","fields":{...},"source_lang":"zh",
--              "pivot":null,"model":"...","prompt_version":1,"error":null,"retry_after_s":null}]
-- p_detect:  {"field_langs":{"content":"zh"},"primary_lang":"zh"} or null
-- CAS on (lease token, src_hash): a result for superseded text is discarded and never resurrected.
create or replace function public.i18n_complete(
  p_entity text, p_entity_id uuid, p_lease uuid, p_src_hash text,
  p_detect jsonb, p_results jsonb, p_usage jsonb default '{}'::jsonb
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_src i18n.sources%rowtype;
  r jsonb;
  v_applied text[] := '{}';
  v_discarded text[] := '{}';
  v_unsafe text[] := '{}';
  v_unsafe_item jsonb;
  v_max int := coalesce(i18n.setting_int('max_attempts'), 6);
  v_n int;
begin
  perform set_config('i18n.writer', 'pipeline', true);
  perform i18n.budget_add(coalesce((p_usage ->> 'calls')::int, 0), coalesce((p_usage ->> 'in')::bigint, 0),
                          coalesce((p_usage ->> 'out')::bigint, 0));
  if p_entity = 'car' then perform i18n.lock_base('car', p_entity_id); end if;   -- lock order: base -> sources
  select * into v_src from i18n.sources s where s.entity = p_entity and s.entity_id = p_entity_id for update;
  if not found or v_src.src_hash is distinct from p_src_hash then
    return jsonb_build_object('stale', true);
  end if;
  if not i18n.entity_is_public(p_entity, p_entity_id) then
    update i18n.translations t set lease_token = null, lease_until = null,
           state = case when t.state in ('pending','failed') then 'hold' else t.state end,
           next_attempt_at = case when t.state = 'ok' and t.refresh then 'infinity'::timestamptz else t.next_attempt_at end,
           updated_at = now()
     where t.entity = p_entity and t.entity_id = p_entity_id and t.lease_token = p_lease;
    return jsonb_build_object('stale', false, 'hidden', true);
  end if;
  if p_detect is not null and jsonb_typeof(p_detect -> 'field_langs') = 'object' then
    update i18n.sources s set field_langs = p_detect -> 'field_langs', primary_lang = p_detect ->> 'primary_lang',
           detected_hash = p_src_hash, detect_provisional = false, updated_at = now()
     where s.entity = p_entity and s.entity_id = p_entity_id;
  end if;
  for r in select value from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    -- A refresh keeps serving the old text until a better translation lands. A rejected (unsafe) regeneration
    -- ends the refresh cycle: pipeline text stays served; legacy text (never output-moderated) is dropped.
    update i18n.translations t set
      state = case
        when r ->> 'outcome' = 'ok' then 'ok'
        when r ->> 'outcome' = 'skipped' then 'skipped'
        when r ->> 'outcome' = 'rejected' then
          case when t.state = 'ok' and t.refresh and t.origin is distinct from 'legacy' then 'ok' else 'rejected' end
        when t.state = 'ok' and t.refresh then 'ok'                                     -- failed refresh keeps the old text
        when r ->> 'outcome' = 'retry' then 'pending'                                   -- e.g. waiting for moderation
        when t.attempts >= v_max then 'dead'
        else 'failed' end,
      fields = case when r ->> 'outcome' = 'ok' then r -> 'fields'
                    when t.state = 'ok' and t.refresh
                         and (r ->> 'outcome' is distinct from 'rejected' or t.origin is distinct from 'legacy')
                      then t.fields else null end,
      source_lang = case when r ->> 'outcome' = 'ok' then r ->> 'source_lang'
                         when t.state = 'ok' and t.refresh
                              and (r ->> 'outcome' is distinct from 'rejected' or t.origin is distinct from 'legacy')
                           then t.source_lang end,
      pivot = case when r ->> 'outcome' = 'ok' then r ->> 'pivot' else t.pivot end,
      origin = case when r ->> 'outcome' = 'ok' then 'pipeline' else t.origin end,
      refresh = case when r ->> 'outcome' in ('ok','rejected') then false
                     when t.refresh and t.attempts >= v_max then false else t.refresh end,
      model = case when r ->> 'outcome' = 'ok' then r ->> 'model' else t.model end,
      prompt_version = case when r ->> 'outcome' = 'ok' then (r ->> 'prompt_version')::int else t.prompt_version end,
      attempts = case when r ->> 'outcome' in ('ok','skipped') then 0
                      when r ->> 'outcome' = 'retry' then greatest(t.attempts - 1, 0) else t.attempts end,
      next_attempt_at = case
        when r ->> 'outcome' in ('ok','skipped','rejected') then now()
        when r ->> 'retry_after_s' is not null then now() + make_interval(secs => least((r ->> 'retry_after_s')::int, 3600))
        when r ->> 'outcome' = 'retry' then now() + interval '30 seconds'
        else now() + i18n.backoff(t.attempts) end,
      last_error = case when r ->> 'outcome' in ('ok','skipped') then null else left(r ->> 'error', 300) end,
      translated_at = case when r ->> 'outcome' = 'ok' then now() else t.translated_at end,
      lease_token = null, lease_until = null, updated_at = now()
    where t.entity = p_entity and t.entity_id = p_entity_id and t.locale = r ->> 'locale'
      and t.lease_token = p_lease and t.src_hash = p_src_hash;
    get diagnostics v_n = row_count;
    if v_n = 1 then v_applied := v_applied || (r ->> 'locale');
    else v_discarded := v_discarded || (r ->> 'locale'); end if;
    if v_n = 1 and r ->> 'outcome' = 'rejected' and r ->> 'error' = 'unsafe_output' then
      v_unsafe := v_unsafe || (r ->> 'locale');
      v_unsafe_item := coalesce(v_unsafe_item, r);
    end if;
  end loop;
  -- Rejected machine output is reviewable by admins (ai_moderation target_type 'translation', context
  -- {entity, locales, src_hash}; restore = public.i18n_admin_restore_translation). Several completions of one
  -- source version add up their locales; a flag an admin already restored for this version stays restored.
  if cardinality(v_unsafe) > 0 then
    insert into public.ai_moderation as m (target_type, target_id, user_id, content, categories, reason, model, status, context)
    values ('translation', p_entity_id, i18n.entity_owner(p_entity, p_entity_id),
            left(coalesce(v_unsafe_item ->> 'text', ''), 4000),
            coalesce(array(select jsonb_array_elements_text(coalesce(v_unsafe_item -> 'categories', '[]'::jsonb))), '{}'),
            left(v_unsafe_item ->> 'reason', 500), v_unsafe_item ->> 'model',
            case when i18n.setting_bool('moderation_enforce') then 'pending' else 'shadow' end,
            jsonb_build_object('entity', p_entity, 'locales', to_jsonb(v_unsafe), 'src_hash', p_src_hash))
    on conflict (target_type, target_id) do update set content = excluded.content, categories = excluded.categories,
      reason = excluded.reason, model = excluded.model,
      context = case when m.context ->> 'src_hash' = p_src_hash
                     then excluded.context || jsonb_build_object('locales', (
                            select to_jsonb(array_agg(distinct l.v order by l.v)) from (
                              select jsonb_array_elements_text(case when jsonb_typeof(m.context -> 'locales') = 'array'
                                                                    then m.context -> 'locales' else '[]'::jsonb end)
                              union select unnest(v_unsafe)) as l(v)))
                     else excluded.context end,
      status = case when m.status = 'restored' and m.context ->> 'src_hash' = p_src_hash then m.status
                    else excluded.status end,
      created_at = case when m.status = 'restored' and m.context ->> 'src_hash' = p_src_hash then m.created_at
                        else now() end,
      reviewed_at = case when m.status = 'restored' and m.context ->> 'src_hash' = p_src_hash then m.reviewed_at end,
      reviewed_by = case when m.status = 'restored' and m.context ->> 'src_hash' = p_src_hash then m.reviewed_by end;
  end if;
  -- release any leased locale the worker did not report (deadline hit)
  update i18n.translations t set lease_token = null, lease_until = null, updated_at = now()
   where t.entity = p_entity and t.entity_id = p_entity_id and t.lease_token = p_lease;
  if p_entity = 'car' then perform i18n.project_car_description(p_entity_id); end if;
  return jsonb_build_object('stale', false, 'applied', v_applied, 'discarded', v_discarded);
end $$;

-- Moderation verdicts are per moderated version (idempotent per mod_hash). Shadow mode (moderation_enforce=false):
-- 'blocked' is recorded as ai_moderation.status='shadow' + sources.moderation='flagged'; nothing is hidden.
-- 'error' = a CONTENT-specific failure (unparseable / invalid verdict): 3 strikes fail open ('skipped'), but only
-- when they span at least 30 minutes since the first strike of this mod_hash; an earlier third strike stays 'error'
-- (attempts not advanced) and the moderation queue holds the row until that mark (mod_lease_until), so a provider
-- outage misread as content failures cannot wave text through. Provider trouble (rate limits, outages, missing key
-- or budget) is never recorded here. Each verdict counts one call against the moderation budget (extra chunk calls:
-- i18n_add_usage(p_mod_calls)) and one against the content author's daily allowance (i18n.mod_author_budget).
drop function if exists public.i18n_record_moderation(text, uuid, text, text, text[], text, text, text, uuid);
create or replace function public.i18n_record_moderation(
  p_entity text, p_entity_id uuid, p_mod_hash text, p_verdict text,
  p_categories text[] default '{}', p_reason text default null, p_model text default null,
  p_text text default null, p_user_id uuid default null
) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_src i18n.sources%rowtype; v_enforce boolean := i18n.setting_bool('moderation_enforce');
begin
  perform set_config('i18n.writer', 'pipeline', true);
  if p_verdict not in ('pass','blocked','skipped','error') then raise exception 'bad verdict'; end if;
  perform i18n.lock_base(p_entity, p_entity_id);                                    -- lock order: base -> sources
  select * into v_src from i18n.sources s where s.entity = p_entity and s.entity_id = p_entity_id for update;
  if not found or p_mod_hash is null or v_src.mod_hash is distinct from p_mod_hash then return 'stale'; end if;
  perform i18n.budget_add(0, 0, 0, case when p_verdict = 'skipped' then 0 else 1 end);
  insert into i18n.mod_author_budget as b (day, user_id, verdicts)
  select (now() at time zone 'utc')::date, o.uid, 1 from (select i18n.entity_owner(p_entity, p_entity_id) uid) o
   where p_verdict <> 'skipped' and o.uid is not null
  on conflict (day, user_id) do update set verdicts = b.verdicts + 1;
  if p_verdict = 'error' then
    update i18n.sources s set
           moderation_attempts = case when x.fail_open or s.moderation_attempts + 1 < 3 then s.moderation_attempts + 1
                                      else s.moderation_attempts end,
           moderation_first_error_at = x.first_at,
           moderation = case when x.fail_open then 'skipped' else s.moderation end,
           moderated_hash = case when x.fail_open then p_mod_hash else s.moderated_hash end,
           mod_lease_until = case when s.moderation_attempts + 1 >= 3 and not x.fail_open
                                  then x.first_at + interval '30 minutes' end
      from (select coalesce(v_src.moderation_first_error_at, now()) as first_at,
                   v_src.moderation_attempts + 1 >= 3
                     and now() - coalesce(v_src.moderation_first_error_at, now()) >= interval '30 minutes' as fail_open) x
     where s.entity = p_entity and s.entity_id = p_entity_id;
    return 'error';
  end if;
  if p_verdict <> 'blocked' then
    update i18n.sources s set moderation = p_verdict, moderated_hash = p_mod_hash, mod_lease_until = null,
           updated_at = now()
     where s.entity = p_entity and s.entity_id = p_entity_id;
    return p_verdict;
  end if;
  insert into public.ai_moderation (target_type, target_id, user_id, content, categories, reason, model, status)
  values (p_entity, p_entity_id, p_user_id, left(coalesce(p_text, ''), 4000), coalesce(p_categories, '{}'),
          p_reason, p_model, case when v_enforce then 'pending' else 'shadow' end)
  on conflict (target_type, target_id) do update set content = excluded.content, categories = excluded.categories,
    reason = excluded.reason, model = excluded.model, status = excluded.status, created_at = now(),
    reviewed_at = null, reviewed_by = null;
  if not v_enforce then
    update i18n.sources s set moderation = 'flagged', moderated_hash = p_mod_hash, mod_lease_until = null,
           updated_at = now()
     where s.entity = p_entity and s.entity_id = p_entity_id;
    return 'flagged';
  end if;
  update i18n.sources s set moderation = 'blocked', moderated_hash = p_mod_hash, mod_lease_until = null,
         updated_at = now()
   where s.entity = p_entity and s.entity_id = p_entity_id;
  perform set_config('i18n.removal_reason', 'moderation', true);
  case p_entity
    when 'car' then update public.cars set status = 'removed' where id = p_entity_id;
    when 'post' then update public.community_posts set status = 'hidden' where id = p_entity_id;
    when 'post_comment' then update public.post_comments set status = 'blocked' where id = p_entity_id;
    when 'car_comment' then update public.comments set status = 'blocked' where id = p_entity_id;
    when 'qa_question' then update public.qa_questions set status = 'hidden' where id = p_entity_id;
    when 'qa_answer' then update public.qa_answers set status = 'blocked' where id = p_entity_id;
    when 'dealer_review' then update public.dealer_reviews set status = 'blocked' where id = p_entity_id;
  end case;
  return 'blocked';
end $$;

create or replace function i18n.entity_owner(p_entity text, p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select case p_entity
    when 'car' then (select seller_id from public.cars where id = p_id)
    when 'post' then (select user_id from public.community_posts where id = p_id)
    when 'post_comment' then (select user_id from public.post_comments where id = p_id)
    when 'car_comment' then (select user_id from public.comments where id = p_id)
    when 'qa_question' then (select user_id from public.qa_questions where id = p_id)
    when 'qa_answer' then (select user_id from public.qa_answers where id = p_id)
    when 'dealer_review' then (select user_id from public.dealer_reviews where id = p_id)
  end
$$;

-- Moderation input + cached verdict for /api/moderate (no lease needed; the verdict is CAS'd on mod_hash).
-- mod_payload = what to moderate (i18n.moderation_payload); payload / extra = translation payload + legacy text.
-- mod_hash is NULL while an unsettled version waits for its author's next daily allowance
-- (i18n.moderation_author_throttled): without the key nothing can be recorded, so the caller does not pay for a call.
drop function if exists public.i18n_moderation_input(text, uuid);
create or replace function public.i18n_moderation_input(p_entity text, p_entity_id uuid)
returns table (src_hash text, payload jsonb, moderation text, moderated boolean, user_id uuid, extra text, is_public boolean,
               mod_hash text, mod_payload jsonb)
language sql stable security definer set search_path = '' as $$
  select s.src_hash, i18n.payload_of(p_entity, p_entity_id), s.moderation, v.settled, v.owner,
         case p_entity
           when 'car' then (select concat_ws(E'\n', title_zh, array_to_string(features_original, ' · '))
                              from public.cars where id = p_entity_id)
           when 'post' then (select array_to_string(tags, ' #') from public.community_posts where id = p_entity_id)
         end,
         i18n.entity_is_public(p_entity, p_entity_id),
         case when not v.settled and i18n.moderation_author_throttled(v.owner) then null else s.mod_hash end,
         i18n.moderation_payload(p_entity, p_entity_id)
  from i18n.sources s
 cross join lateral (select coalesce(s.moderated_hash = s.mod_hash, false)
                              and s.moderation in ('pass','flagged','blocked','skipped') as settled,
                            i18n.entity_owner(p_entity, p_entity_id) as owner) v
 where s.entity = p_entity and s.entity_id = p_entity_id
$$;

-- Moderation work that no translation claim carries (cars without a description, features / trim / tags-only
-- edits, writes that skipped /api/moderate): public, untrusted sources whose verdict is not settled for the
-- current mod_hash, oldest first. Leases each row for p_lease_seconds (SKIP LOCKED); i18n_record_moderation
-- clears the lease. Nothing when the moderation budget is exhausted; nothing of an author whose daily allowance is
-- used up (i18n.moderation_author_throttled) until the next UTC day.
create or replace function public.i18n_moderation_queue(p_limit int default 20, p_lease_seconds int default 90)
returns table (entity text, entity_id uuid, mod_hash text)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if i18n.moderation_budget_exhausted() then return; end if;
  return query
  with picked as (
    select s.entity as e, s.entity_id as id from i18n.sources s
     where not s.trusted and s.mod_hash is not null and s.moderation_attempts < 3
       and (s.moderation not in ('pass','flagged','blocked','skipped') or s.moderated_hash is distinct from s.mod_hash)
       and (s.mod_lease_until is null or s.mod_lease_until < now())
       and i18n.entity_is_public(s.entity, s.entity_id)
       and not i18n.moderation_author_throttled(i18n.entity_owner(s.entity, s.entity_id))
     order by s.updated_at
     limit least(greatest(coalesce(p_limit, 20), 1), 200)
     for update of s skip locked
  )
  update i18n.sources s set mod_lease_until = now() + make_interval(secs => greatest(coalesce(p_lease_seconds, 90), 30))
    from picked where s.entity = picked.e and s.entity_id = picked.id
  returning s.entity, s.entity_id, s.mod_hash;
end $$;

-- Detection without a lease (backfill / drain detect passes + read-model warm-up). CAS on src_hash.
-- p_include_provisional: also rows detected only provisionally (local best guess), for the LLM pass to refine;
-- false = only undetected rows (the budget-free local pass). Undetected rows come first.
drop function if exists public.i18n_detection_queue(int);
create or replace function public.i18n_detection_queue(p_limit int default 200, p_include_provisional boolean default true)
returns table (entity text, entity_id uuid, src_hash text, payload jsonb)
language sql stable security definer set search_path = '' as $$
  select s.entity, s.entity_id, s.src_hash, i18n.payload_of(s.entity, s.entity_id)
    from i18n.sources s
   where (s.detected_hash is distinct from s.src_hash or (p_include_provisional and s.detect_provisional))
     and s.src_hash <> i18n.hash_payload('{}'::jsonb)
   order by (s.detected_hash is not distinct from s.src_hash), s.updated_at
   limit least(greatest(coalesce(p_limit, 200), 1), 1000)
$$;

-- p_items: [{"entity":"post","entity_id":"…","src_hash":"…","field_langs":{…},"primary_lang":"zh","provisional":false}]
-- "provisional": true = the local detector's best guess for ambiguous text: it counts as detected (sitemaps,
-- hreflang, bundle) but never overwrites a confirmed detection of the same version; a confirmed record clears it.
create or replace function public.i18n_record_detection(p_items jsonb) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare r jsonb; n int := 0; v int; v_prov boolean;
begin
  perform set_config('i18n.writer', 'pipeline', true);
  for r in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    continue when jsonb_typeof(r -> 'field_langs') is distinct from 'object';
    v_prov := coalesce(r -> 'provisional' = 'true'::jsonb, false);
    update i18n.sources s set field_langs = r -> 'field_langs', primary_lang = r ->> 'primary_lang',
           detected_hash = s.src_hash, detect_provisional = v_prov, updated_at = now()
     where s.entity = r ->> 'entity' and s.entity_id = (r ->> 'entity_id')::uuid and s.src_hash = r ->> 'src_hash'
       and (not v_prov or s.detected_hash is distinct from s.src_hash or s.detect_provisional);
    get diagnostics v = row_count;
    n := n + v;
  end loop;
  return n;
end $$;

-- p_calls / p_in / p_out: translation, detection and glossary spend; p_mod_calls: moderation calls
drop function if exists public.i18n_add_usage(int, bigint, bigint);
create or replace function public.i18n_add_usage(p_calls int, p_in bigint default 0, p_out bigint default 0,
                                                 p_mod_calls int default 0)
returns void language sql volatile security definer set search_path = '' as $$
  select i18n.budget_add(p_calls, p_in, p_out, p_mod_calls)
$$;

-- Both daily breakers, for the worker to check before paying for a call
create or replace function public.i18n_budget_state()
returns table (translate_exhausted boolean, moderation_exhausted boolean)
language sql stable security definer set search_path = '' as $$
  select i18n.budget_exhausted(), i18n.moderation_budget_exhausted()
$$;

-- Glossary jobs, grouped by ONE public, moderated entity (a car's features or a post's tags; <= 40 aliases),
-- so one model call never mixes two authors' text. Aliases longer than 60 chars are never sent (shown raw).
-- "Moderated" = a verdict settled for the current mod_hash (which covers the tags). 'blocked' counts too: content
-- that is actually hidden is already excluded by the visibility joins, so an entity an admin restored after a
-- block still gets its tags resolved.
drop function if exists public.i18n_claim_terms(int, int);
create or replace function public.i18n_claim_terms(p_max_groups int default 4, p_lease_seconds int default 90)
returns table (kind text, group_id uuid, alias_norm text, sample_raw text, lease_token uuid, trusted boolean)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare r record; v_token uuid;
begin
  perform set_config('i18n.writer', 'pipeline', true);
  if i18n.budget_exhausted() then return; end if;
  for r in
    select g.k, g.gid, g.tr from (
      select 'feature'::text as k, cf.car_id as gid, min(a.next_attempt_at) as na, bool_and(s.trusted) as tr
        from i18n.car_features cf
        join i18n.term_aliases a on a.kind = 'feature' and a.alias_norm = cf.alias_norm
        join public.cars c on c.id = cf.car_id and c.status = 'active' and not c.owner_hidden
        join i18n.sources s on s.entity = 'car' and s.entity_id = c.id
         and s.moderation in ('pass','flagged','blocked','skipped') and s.moderated_hash = s.mod_hash
       where a.state in ('pending','failed') and a.next_attempt_at <= now()
         and (a.lease_until is null or a.lease_until < now()) and char_length(a.alias_norm) <= 60
       group by cf.car_id
      union all
      select 'topic', pt.post_id, min(a.next_attempt_at), false
        from i18n.post_tags pt
        join i18n.term_aliases a on a.kind = 'topic' and a.alias_norm = pt.alias_norm
        join public.community_posts p on p.id = pt.post_id and p.status = 'active'
        join i18n.sources s on s.entity = 'post' and s.entity_id = p.id
         and s.moderation in ('pass','flagged','blocked','skipped') and s.moderated_hash = s.mod_hash
       where a.state in ('pending','failed') and a.next_attempt_at <= now()
         and (a.lease_until is null or a.lease_until < now()) and char_length(a.alias_norm) <= 60
       group by pt.post_id
    ) g
    order by g.na
    limit least(greatest(coalesce(p_max_groups, 4), 1), 20)
  loop
    v_token := gen_random_uuid();
    return query
    with picked as (
      select a.kind as k, a.alias_norm as n from i18n.term_aliases a
       where a.kind = r.k and a.state in ('pending','failed') and a.next_attempt_at <= now()
         and (a.lease_until is null or a.lease_until < now()) and char_length(a.alias_norm) <= 60
         and a.alias_norm in (select cf.alias_norm from i18n.car_features cf where r.k = 'feature' and cf.car_id = r.gid
                              union all
                              select pt.alias_norm from i18n.post_tags pt where r.k = 'topic' and pt.post_id = r.gid)
       order by a.alias_norm
       limit 40
       for update of a skip locked
    ), upd as (
      update i18n.term_aliases a set lease_token = v_token, lease_until = now() + make_interval(secs => p_lease_seconds),
             attempts = a.attempts + 1
        from picked where a.kind = picked.k and a.alias_norm = picked.n
      returning a.kind as k, a.alias_norm as n, a.sample_raw as raw, a.lease_token as tok
    )
    select upd.k, r.gid, upd.n, upd.raw, upd.tok, coalesce(r.tr, false) from upd;
  end loop;
end $$;

-- Complete ONE leased alias (one post's / one car's tag). Security model (critic gap 4):
--   * only the leased alias row changes (term_id, state, lang); no other spelling or pending row is touched
--   * the alias joins an existing topic ONLY on exact slug equality; an existing term's labels are never edited
--   * LLM labels are stored on a NEW term only and never become aliases (they widen search via labels instead)
--   * p_alias_lang = lib/i18n/detect.ts of the spelling (display rule in i18n.bundle_extra)
--   * p_outcome 'retry' = no model output (missing key, deadline, rate limit, 401/402): the lease is released,
--     the attempt refunded, the state kept, next try after p_retry_after_s (default 15 min, max 1 h)
drop function if exists public.i18n_complete_term(text, text, uuid, text, text, jsonb, text, text);
drop function if exists public.i18n_complete_term(text, text, uuid, text, text, jsonb, text, text, text);
create or replace function public.i18n_complete_term(
  p_kind text, p_alias_norm text, p_lease uuid, p_outcome text,
  p_slug text default null, p_labels jsonb default null, p_model text default null, p_error text default null,
  p_alias_lang text default null, p_retry_after_s int default null
) returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare v_term bigint; v_max int := coalesce(i18n.setting_int('max_attempts'), 6);
begin
  perform set_config('i18n.writer', 'pipeline', true);
  perform 1 from i18n.term_aliases a where a.kind = p_kind and a.alias_norm = p_alias_norm and a.lease_token = p_lease for update;
  if not found then return null; end if;
  if p_outcome = 'retry' then
    update i18n.term_aliases a set lease_token = null, lease_until = null, attempts = greatest(a.attempts - 1, 0),
           last_error = coalesce(left(p_error, 300), a.last_error),
           next_attempt_at = now() + make_interval(secs => greatest(least(coalesce(p_retry_after_s, 900), 3600), 0))
     where a.kind = p_kind and a.alias_norm = p_alias_norm;
    return null;
  end if;
  if p_outcome <> 'ok' or p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug) > 48
     or jsonb_typeof(p_labels) is distinct from 'object' then
    update i18n.term_aliases a set lease_token = null, lease_until = null, last_error = left(p_error, 300),
           state = case when p_outcome = 'rejected' then 'rejected' when a.attempts >= v_max then 'dead' else 'failed' end,
           next_attempt_at = now() + i18n.backoff(a.attempts)
     where a.kind = p_kind and a.alias_norm = p_alias_norm;
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtext('i18n_terms:' || p_kind));   -- serialize slug creation per kind
  select coalesce(t.merged_into, t.id) into v_term from i18n.terms t where t.kind = p_kind and t.slug = p_slug;
  if v_term is null then
    insert into i18n.terms (kind, slug, labels, origin, model) values (p_kind, p_slug, p_labels, 'llm', p_model)
    returning id into v_term;
  end if;
  update i18n.term_aliases a set term_id = v_term, state = 'ok', lang = coalesce(p_alias_lang, a.lang),
         lease_token = null, lease_until = null, last_error = null
   where a.kind = p_kind and a.alias_norm = p_alias_norm;
  if p_kind = 'feature' and i18n.setting_bool('enforce') then
    -- compat projection of the cars carrying THIS spelling (SKIP LOCKED: the hourly sweep catches skipped rows)
    update public.cars c set features = i18n.project_features(c.features_original)
     where c.id in (select c2.id from public.cars c2
                     where c2.id in (select cf.car_id from i18n.car_features cf where cf.alias_norm = p_alias_norm)
                     for update skip locked);
  end if;
  return v_term;
end $$;

-- Deterministic seeds (brands/models/dictionary): labels always win over LLM labels; every label and every extra
-- alias becomes an 'ok' alias of this term (trusted input from the repo, never from users).
drop function if exists public.i18n_seed_term(text, text, jsonb, text, text[]);
create or replace function public.i18n_seed_term(p_kind text, p_slug text, p_labels jsonb, p_origin text,
                                                 p_aliases text[], p_alias_langs text[] default null)
returns bigint language plpgsql volatile security definer set search_path = '' as $$
declare v_term bigint;
begin
  perform set_config('i18n.writer', 'pipeline', true);
  insert into i18n.terms (kind, slug, labels, origin) values (p_kind, p_slug, p_labels, p_origin)
  on conflict (kind, slug) do update set labels = i18n.terms.labels || excluded.labels, origin = excluded.origin,
    updated_at = now()
  returning id into v_term;
  insert into i18n.term_aliases (kind, alias_norm, sample_raw, term_id, state, lang)
  select distinct on (x.n) p_kind, x.n, x.raw, v_term, 'ok', x.lang
    from (
      select i18n.norm_tag(l.value) as n, l.value as raw, l.key as lang,
             coalesce(array_position(array['zh','en','ko','ja','es','fr'], l.key), 50) as ord
        from jsonb_each_text(coalesce(p_labels, '{}'::jsonb)) l
      union all
      select i18n.norm_tag(u.a), u.a, u.lg, 100 + u.o::int
        from unnest(coalesce(p_aliases, '{}'), coalesce(p_alias_langs, '{}')) with ordinality as u(a, lg, o)
       where u.a is not null
    ) x
   where x.n is not null
   order by x.n, x.ord
  on conflict (kind, alias_norm) do update set term_id = excluded.term_id, state = 'ok', lease_token = null,
    lease_until = null, lang = coalesce(excluded.lang, i18n.term_aliases.lang);
  return v_term;
end $$;

create or replace function public.i18n_seed_title_maps(p_makes jsonb, p_models jsonb) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  insert into i18n.make_zh (make, zh) select key, value from jsonb_each_text(coalesce(p_makes, '{}'))
  on conflict (make) do update set zh = excluded.zh;
  insert into i18n.model_zh (make, model_norm, zh)
  select m.key, lower(btrim(x.key)), x.value from jsonb_each(coalesce(p_models, '{}')) m, jsonb_each_text(m.value) x
  on conflict (make, model_norm) do update set zh = excluded.zh;
end $$;

-- Legacy stash pages for scripts/i18n-backfill.ts --import-legacy (keyset by id). payload = CURRENT originals.
-- trusted = sources.trusted: only trusted (syndicated) text may reuse its never-output-moderated legacy cache.
drop function if exists public.i18n_legacy_page(text, uuid, int);
create or replace function public.i18n_legacy_page(p_entity text, p_after uuid default null, p_limit int default 200)
returns table (entity_id uuid, src_hash text, payload jsonb, field_langs jsonb, primary_lang text,
               is_public boolean, legacy jsonb, trusted boolean)
language sql stable security definer set search_path = '' as $$
  select l.entity_id, s.src_hash, i18n.payload_of(l.entity, l.entity_id),
         case when s.detected_hash = s.src_hash then s.field_langs end,
         case when s.detected_hash = s.src_hash then s.primary_lang end,
         i18n.entity_is_public(l.entity, l.entity_id), l.legacy, s.trusted
    from i18n.legacy_text l
    join i18n.sources s on s.entity = l.entity and s.entity_id = l.entity_id
   where l.entity = p_entity and (p_after is null or l.entity_id > p_after)
   order by l.entity_id
   limit least(greatest(coalesce(p_limit, 200), 1), 500)
$$;

-- One-time import of legacy cache entries already validated in TS against the CURRENT original.
create or replace function public.i18n_import_legacy(
  p_entity text, p_entity_id uuid, p_locale text, p_src_hash text, p_fields jsonb,
  p_source_lang text, p_field_langs jsonb, p_refresh boolean
) returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v_found boolean;
begin
  perform set_config('i18n.writer', 'pipeline', true);
  if p_entity = 'car' then perform i18n.lock_base('car', p_entity_id); end if;
  update i18n.sources s set field_langs = coalesce(s.field_langs, p_field_langs),
         primary_lang = coalesce(s.primary_lang, p_source_lang), detected_hash = coalesce(s.detected_hash, p_src_hash)
   where s.entity = p_entity and s.entity_id = p_entity_id and s.src_hash = p_src_hash and p_field_langs is not null;
  -- a refresh row of an entity that is not public (anymore) is parked like set_public(false) parks it
  update i18n.translations t set state = 'ok', fields = p_fields, source_lang = p_source_lang, origin = 'legacy',
         refresh = p_refresh, priority = 5, translated_at = now(), attempts = 0, last_error = null,
         next_attempt_at = case when p_refresh and not i18n.entity_is_public(p_entity, p_entity_id)
                                then 'infinity'::timestamptz else t.next_attempt_at end,
         updated_at = now()
   where t.entity = p_entity and t.entity_id = p_entity_id and t.locale = p_locale and t.src_hash = p_src_hash
     and t.state in ('pending','failed','hold');
  v_found := found;
  if v_found and p_entity = 'car' then perform i18n.project_car_description(p_entity_id); end if;
  return v_found;
end $$;

-- ---------- 14. Operations ----------
create or replace function public.i18n_stats()
returns table (entity text, locale text, state text, n bigint)
language sql stable security definer set search_path = '' as $$
  select x.entity, x.locale, x.state, x.n from (
    -- '+refresh(parked)': refresh rows of entities that are not public; not actionable until they are public again
    select t.entity, t.locale,
           t.state || case when t.refresh and t.next_attempt_at = 'infinity' then '+refresh(parked)'
                           when t.refresh then '+refresh' else '' end as state, count(*) as n
      from i18n.translations t group by 1, 2, 3
    union all
    select s.entity, '_moderation', s.moderation, count(*) from i18n.sources s group by 1, 2, 3
    union all
    select s.entity, '_detected', (s.detected_hash = s.src_hash)::text, count(*) from i18n.sources s group by 1, 2, 3
    union all
    select 'term:' || a.kind, '-', a.state, count(*) from i18n.term_aliases a group by 1, 2, 3
  ) x
  where i18n.writer_class() in ('admin','service','system')
  order by 1, 2, 3
$$;

-- ok -> refresh (regenerate, keep serving); failed / dead / rejected -> queued again. Entities that are not public
-- are parked (refresh rows: next_attempt_at 'infinity'; others: 'hold') and resume via i18n.set_public.
create or replace function i18n.requeue(p_entity text, p_ids uuid[], p_locales text[], p_older_prompt_than int)
returns int language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  perform set_config('i18n.writer', 'pipeline', true);
  update i18n.translations t set
    state = case when t.state = 'ok' then 'ok'
                 when i18n.entity_is_public(t.entity, t.entity_id) then 'pending' else 'hold' end,
    refresh = t.state = 'ok', attempts = 0,
    next_attempt_at = case when t.state <> 'ok' or i18n.entity_is_public(t.entity, t.entity_id) then now()
                           else 'infinity'::timestamptz end,
    last_error = null, updated_at = now()
  where t.entity = p_entity and (p_ids is null or t.entity_id = any(p_ids))
    and (p_locales is null or t.locale = any(p_locales))
    and (p_older_prompt_than is null or coalesce(t.prompt_version, 0) < p_older_prompt_than)
    and t.state in ('ok','failed','dead','rejected');
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.i18n_admin_requeue(p_entity text, p_ids uuid[] default null,
  p_locales text[] default null, p_older_prompt_than int default null)
returns int language plpgsql volatile security definer set search_path = '' as $$
begin
  if i18n.writer_class() not in ('admin','service','system') then raise exception 'forbidden'; end if;
  return i18n.requeue(p_entity, p_ids, p_locales, p_older_prompt_than);
end $$;

-- Glossary aliases back to 'pending' (after a model outage left them failed / dead, or to re-try rejected labels).
-- Resolved ('ok') aliases are never touched: their topic links stay. scripts/i18n-backfill.ts --requeue-terms.
create or replace function public.i18n_admin_requeue_terms(p_kind text default null,
  p_states text[] default array['failed','dead'], p_alias_norms text[] default null)
returns int language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  if i18n.writer_class() not in ('admin','service','system') then raise exception 'forbidden'; end if;
  update i18n.term_aliases a set state = 'pending', attempts = 0, next_attempt_at = now(),
         lease_token = null, lease_until = null, last_error = null
   where (p_kind is null or a.kind = p_kind)
     and a.state = any(coalesce(p_states, array['failed','dead'])) and a.state <> 'ok'
     and (p_alias_norms is null or a.alias_norm = any(p_alias_norms));
  get diagnostics n = row_count;
  return n;
end $$;

-- An admin overrides the output moderation of one source version (the src_hash its flag was raised for): the
-- worker then skips output moderation for that version (claim meta moderate_outputs) and every rejected locale is
-- queued again. A later edit changes src_hash, so the override never carries over to new text.
create or replace function i18n.restore_translation(p_entity text, p_id uuid, p_src_hash text) returns int
language plpgsql security definer set search_path = '' as $$
declare v_locales text[];
begin
  update i18n.sources s set output_override_hash = coalesce(p_src_hash, s.src_hash)
   where s.entity = p_entity and s.entity_id = p_id;
  select array_agg(t.locale order by t.locale) into v_locales from i18n.translations t
   where t.entity = p_entity and t.entity_id = p_id and t.state = 'rejected';
  if v_locales is null then return 0; end if;
  return i18n.requeue(p_entity, array[p_id], v_locales, null);
end $$;

-- Restore one 'translation' flag (admin JWT or SQL editor): override + requeue, flag marked 'restored'.
-- Returns the number of locale rows queued again.
create or replace function public.i18n_admin_restore_translation(p_flag_id uuid) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare v_flag public.ai_moderation%rowtype; n int;
begin
  if i18n.writer_class() not in ('admin','system') then raise exception 'forbidden'; end if;
  perform set_config('i18n.writer', 'pipeline', true);
  select * into v_flag from public.ai_moderation m where m.id = p_flag_id and m.target_type = 'translation' for update;
  if not found then return 0; end if;
  n := i18n.restore_translation(v_flag.context ->> 'entity', v_flag.target_id, v_flag.context ->> 'src_hash');
  update public.ai_moderation m set status = 'restored', reviewed_at = now(),
         reviewed_by = coalesce(auth.uid(), m.reviewed_by)
   where m.id = p_flag_id;
  return n;
end $$;

-- Settings (admin JWT or SQL editor). Flipping enforce to true recomputes titles + projections of every car.
create or replace function public.i18n_admin_set(p_key text, p_value jsonb) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if i18n.writer_class() not in ('admin','system') then raise exception 'forbidden'; end if;
  insert into i18n.settings (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  if p_key = 'enforce' and p_value = 'true'::jsonb then
    perform i18n.reproject_cars(1000000, true);
  end if;
end $$;

-- Bulk restore of AI moderation decisions (false-positive storm). Admin JWT or SQL editor. A flag parked for a
-- fast rollback (shadow + context.parked, i18n-v2-rollback.sql header) still hides its content: it is restored like
-- a pending one and keeps the marker (the un-park step keeps its 'restored' status).
create or replace function public.i18n_admin_restore_moderation(p_since timestamptz, p_target_type text default null)
returns int language plpgsql volatile security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  if i18n.writer_class() not in ('admin','system') then raise exception 'forbidden'; end if;
  perform set_config('i18n.writer', 'pipeline', true);
  for r in select m.id, m.target_type, m.target_id, m.context from public.ai_moderation m
            where (m.status = 'pending' or (m.status = 'shadow' and m.context ->> 'parked' = 'true'))
              and m.created_at >= p_since
              and (p_target_type is null or m.target_type = p_target_type)
  loop
    case r.target_type
      when 'car' then update public.cars set status = 'active', removal_reason = null where id = r.target_id and status = 'removed';
      when 'post' then update public.community_posts set status = 'active' where id = r.target_id and status = 'hidden';
      when 'post_comment' then update public.post_comments set status = 'active' where id = r.target_id;
      when 'car_comment' then update public.comments set status = 'active' where id = r.target_id;
      when 'qa_question' then update public.qa_questions set status = 'active' where id = r.target_id;
      when 'qa_answer' then update public.qa_answers set status = 'active' where id = r.target_id;
      when 'dealer_review' then update public.dealer_reviews set status = 'active' where id = r.target_id;
      when 'translation' then perform i18n.restore_translation(r.context ->> 'entity', r.target_id,
                                                                r.context ->> 'src_hash');
      else null;
    end case;
    update public.ai_moderation set status = 'restored', reviewed_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- 15. Grants (Supabase default privileges would otherwise expose every public function) ----------
do $$
declare f text;
begin
  -- service_role only: pipeline, detection, glossary, seeds, legacy import, sitemap (full-table scans)
  foreach f in array array[
    'i18n_claim(int,int,text,uuid[],text[])',
    'i18n_complete(text,uuid,uuid,text,jsonb,jsonb,jsonb)',
    'i18n_record_moderation(text,uuid,text,text,text[],text,text,text,uuid)',
    'i18n_moderation_input(text,uuid)',
    'i18n_moderation_queue(int,int)',
    'i18n_detection_queue(int,boolean)',
    'i18n_record_detection(jsonb)',
    'i18n_add_usage(int,bigint,bigint,int)',
    'i18n_budget_state()',
    'i18n_claim_terms(int,int)',
    'i18n_complete_term(text,text,uuid,text,text,jsonb,text,text,text,int)',
    'i18n_seed_term(text,text,jsonb,text,text[],text[])',
    'i18n_seed_title_maps(jsonb,jsonb)',
    'i18n_legacy_page(text,uuid,int)',
    'i18n_import_legacy(text,uuid,text,text,jsonb,text,jsonb,boolean)',
    'sitemap_counts(text)',
    'sitemap_entries(text,text,int,int)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  -- admin JWT (checked inside) or service role
  foreach f in array array[
    'i18n_stats()', 'i18n_admin_set(text,jsonb)', 'i18n_admin_requeue(text,uuid[],text[],int)',
    'i18n_admin_requeue_terms(text,text[],text[])', 'i18n_admin_restore_moderation(timestamptz,text)',
    'i18n_admin_restore_translation(uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
  -- public reads (visibility enforced inside)
  foreach f in array array[
    'i18n_bundle(text,uuid[],text)', 'i18n_term_labels(text,text[],text)', 'i18n_norm_tag(text)',
    'search_posts(text,text,text,int,int)', 'topic_get(text,text)']
  loop
    execute format('grant execute on function public.%s to anon, authenticated, service_role', f);
  end loop;
end $$;

-- ---------- 16. pg_cron (DB-internal only; the LLM worker is driven by the Vercel cron) ----------
select cron.schedule('i18n-sweep', '17 * * * *', $c$select i18n.sweep()$c$);
select cron.schedule('i18n-budget-purge', '5 3 * * *',
  $c$delete from i18n.budget where day < current_date - 90; delete from i18n.mod_author_budget where day < current_date - 7$c$);

commit;
notify pgrst, 'reload schema';
