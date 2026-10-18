-- =====================================================================
-- supabase/i18n-v2-data.sql — one-time data migration. Run ONCE, right after i18n-v2.sql
-- (re-running is harmless: every step is guarded). Runs as the pipeline writer so the guards
-- neither remap legacy columns nor move content_updated_at.
-- =====================================================================
begin;
select set_config('i18n.writer', 'pipeline', true);

-- 0. Snapshot the legacy compat text + caches ONCE (on conflict do nothing: a re-run never overwrites the
--    snapshot). The enforce flip later re-projects cars.description/description_zh from validated
--    translations, and cleanup clears other_i18n; --import-legacy reads this stash instead (spec 2.8, 10.1).
insert into i18n.legacy_text (entity, entity_id, legacy)
select 'car', c.id, jsonb_build_object('description', c.description, 'description_zh', c.description_zh,
                                       'other_i18n', c.other_i18n)
  from public.cars c
 where nullif(btrim(c.description), '') is not null or nullif(btrim(c.description_zh), '') is not null
    or c.other_i18n <> '{}'::jsonb
on conflict (entity, entity_id) do nothing;
insert into i18n.legacy_text (entity, entity_id, legacy)
select 'post', p.id, jsonb_build_object('other_i18n', p.other_i18n) from public.community_posts p
 where p.other_i18n <> '{}'::jsonb
on conflict (entity, entity_id) do nothing;
insert into i18n.legacy_text (entity, entity_id, legacy)
select 'post_comment', x.id, jsonb_build_object('other_i18n', x.other_i18n) from public.post_comments x
 where x.other_i18n <> '{}'::jsonb
on conflict (entity, entity_id) do nothing;
insert into i18n.legacy_text (entity, entity_id, legacy)
select 'car_comment', x.id, jsonb_build_object('other_i18n', x.other_i18n) from public.comments x
 where x.other_i18n <> '{}'::jsonb
on conflict (entity, entity_id) do nothing;

-- 1. Content clock baselines (pipeline writes never bump it; explicit values are kept)
update public.cars set content_updated_at = greatest(created_at, coalesce(price_updated_at, created_at))
 where content_updated_at is null;
update public.community_posts set content_updated_at = coalesce(updated_at, created_at)
 where content_updated_at is null;

-- 2. Originals. Syndicated/API rows: `description` is the scraped/posted text (sync rewrites it every pass).
--    App-posted rows: the form's only field was description_zh.
update public.cars set description_original = case
    when source_id is not null or api_key_id is not null
      then coalesce(nullif(btrim(description), ''), nullif(btrim(description_zh), ''))
    else coalesce(nullif(btrim(description_zh), ''), nullif(btrim(description), '')) end
 where description_original is null
   and coalesce(nullif(btrim(description), ''), nullif(btrim(description_zh), '')) is not null;

-- 3. R3: app-posted cars whose publish-time AI rewrote BOTH columns: the stored "original" may be
--    machine-processed. Flag once (5 rows on 2026-10-12); car-edit asks the seller to confirm.
do $$
begin
  if not exists (select 1 from i18n.settings where key = 'data_v2_done') then
    update public.cars set original_uncertain = true
     where source_id is null and api_key_id is null
       and nullif(btrim(description), '') is not null and nullif(btrim(description_zh), '') is not null;
  end if;
end $$;

-- 4. Feature originals. Syndicated cars: drop the AI-added Chinese twins when dealer (Latin) tags exist
--    (the next sync rewrites raw dealer tags anyway). App cars: keep the seller's tags as typed.
update public.cars c set features_original = case
    when c.source_id is not null and exists (select 1 from unnest(c.features) f where f !~ '[一-鿿]')
      then array(select f from unnest(c.features) with ordinality as u(f, o) where f !~ '[一-鿿]' order by o)
    else coalesce(c.features, '{}') end
 where cardinality(c.features_original) = 0 and cardinality(coalesce(c.features, '{}')) > 0;

-- 5. B10: removals that were admin decisions (cars of banned sellers) stay removed for owners and sync.
update public.cars c set removal_reason = 'admin'
  from public.profiles p
 where p.id = c.seller_id and p.banned and c.status = 'removed' and c.removal_reason is null;

-- 5b. B33: old builds (and new ones while the reply_to_* columns were missing) wrote the reply target into
--     post_comments.content as a '回复 @name：' prefix. Move it into reply_to_name / reply_to_user_id with the
--     rule of i18n.ugc_before (same pattern; target = the latest commenter with that username in the post, as of
--     the reply; reply_to_name is only ever a real username). Runs before the sweep, so sources hash the stripped
--     text. Left as they are: rows that already carry reply metadata (=> idempotent), prefix-only rows, prefixes
--     naming nobody who had commented in the thread, and rows over the 5000-char cap (the NOT VALID check still
--     applies to updates and would abort the migration).
update public.post_comments x set
    content = l.rest,
    reply_to_name = l.name,
    reply_to_user_id = l.uid
  from (select c.id, p.name, p.rest,
               (select pc.user_id from public.post_comments pc join public.profiles pr on pr.id = pc.user_id
                 where pc.post_id = c.post_id and pc.id <> c.id and pr.username = p.name
                   and (c.created_at is null or pc.created_at <= c.created_at)
                 order by pc.created_at desc nulls last limit 1) as uid
          from public.post_comments c
         cross join lateral (select
               substring(c.content from '^回复 @([^：:' || E'\n' || ']{1,40})[：:]') as name,
               btrim(regexp_replace(c.content, '^回复 @[^：:' || E'\n' || ']{1,40}[：:][[:space:]]*', '')) as rest) p
         where c.reply_to_name is null and c.reply_to_user_id is null and c.content like '回复 @%') l
 where x.id = l.id and l.name is not null and l.rest <> '' and char_length(l.rest) <= 5000 and l.uid is not null;

-- 6. Sources + queue rows + tag/feature link rows for everything that predates the triggers. Only this first run
--    trusts syndicated text (cars held by their source's system account: sync wrote it); a re-run (data_v2_done
--    set) repairs drift untrusted, like the hourly sweep.
select i18n.sweep(1000000, not exists (select 1 from i18n.settings where key = 'data_v2_done'));

-- 7. Grandfather existing content: AI moderation applies to new/edited content only (open question in spec).
--    First run only: on a re-run, pending verdicts belong to new content and must still be moderated.
update i18n.sources set moderation = 'skipped', moderated_hash = mod_hash
 where moderation = 'pending' and not exists (select 1 from i18n.settings where key = 'data_v2_done');

-- 8. Backfill order by crawl value: viewed cars and posts first, then other cars, then comments/Q&A/reviews.
--    (The backfill script additionally runs zh/en before ko/ja/es/fr.) First run only: later pending rows are
--    new content at priority 0.
do $$
begin
  if not exists (select 1 from i18n.settings where key = 'data_v2_done') then
    update i18n.translations set priority = 2 where entity = 'car' and state = 'pending';
    update i18n.translations t set priority = 1
      from public.cars c where t.entity = 'car' and c.id = t.entity_id and c.views_count > 0 and t.state = 'pending';
    update i18n.translations set priority = 1 where entity = 'post' and state = 'pending';
    update i18n.translations set priority = 3 where entity not in ('car','post') and state = 'pending';
  end if;
end $$;

insert into i18n.settings (key, value) values ('data_v2_done', to_jsonb(now()::text))
on conflict (key) do nothing;
commit;
