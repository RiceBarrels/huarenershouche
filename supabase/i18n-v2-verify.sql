-- =====================================================================
-- supabase/i18n-v2-verify.sql — READ-ONLY checks. Run after each rollout step; every "must be" line is a gate.
-- =====================================================================
-- 1. Structure present
select (select count(*) from information_schema.tables where table_schema = 'i18n') as i18n_tables,          -- must be 12
       (select count(*) from pg_trigger where tgname like 'i18n_%' and not tgisinternal) as i18n_triggers,      -- must be 17
       (select count(*) from cron.job where jobname like 'i18n-%') as cron_jobs;                                -- must be 2
-- 2. Privileges: API roles cannot reach the private schema, pipeline RPCs or the full-scan sitemap RPCs
select has_schema_privilege('anon', 'i18n', 'USAGE') as anon_usage,                                               -- false
       has_schema_privilege('authenticated', 'i18n', 'USAGE') as auth_usage,                                      -- false
       has_function_privilege('anon', 'public.i18n_complete(text,uuid,uuid,text,jsonb,jsonb,jsonb)', 'EXECUTE') as anon_complete, -- false
       has_function_privilege('authenticated', 'public.i18n_claim(int,int,text,uuid[],text[])', 'EXECUTE') as auth_claim,          -- false
       has_function_privilege('authenticated', 'public.i18n_moderation_queue(int,int)', 'EXECUTE') as auth_mod_queue,              -- false
       has_function_privilege('authenticated', 'public.i18n_budget_state()', 'EXECUTE') as auth_budget_state,                      -- false
       has_function_privilege('anon', 'public.sitemap_entries(text,text,int,int)', 'EXECUTE') as anon_sitemap,                    -- false
       has_function_privilege('anon', 'public.i18n_legacy_page(text,uuid,int)', 'EXECUTE') as anon_legacy,                        -- false
       has_function_privilege('anon', 'public.i18n_admin_restore_translation(uuid)', 'EXECUTE') as anon_restore_translation,       -- false
       has_function_privilege('anon', 'public.i18n_bundle(text,uuid[],text)', 'EXECUTE') as anon_bundle,                          -- true
       has_function_privilege('anon', 'public.i18n_norm_tag(text)', 'EXECUTE') as anon_norm_tag;                                 -- true
-- public.i18n_norm_tag must not reference the private schema (anon has no USAGE on i18n)
select position('i18n.' in prosrc) = 0 as norm_tag_inlined from pg_proc where proname = 'i18n_norm_tag';         -- true
-- 3. Invariants
select count(*) as ok_rows_with_stale_hash                                                                          -- must be 0
  from i18n.translations t join i18n.sources s using (entity, entity_id)
 where t.state = 'ok' and t.src_hash <> s.src_hash;
select count(*) as active_described_cars_without_original                                                           -- must be 0
  from public.cars where status = 'active' and description_original is null
   and coalesce(nullif(btrim(description), ''), nullif(btrim(description_zh), '')) is not null;
select count(*) as entities_without_source from (                                                                   -- must be 0
  select id from public.cars except select entity_id from i18n.sources where entity = 'car') x;
select count(*) as sources_without_mod_hash from i18n.sources where mod_hash is null;                             -- must be 0
select count(*) as leased_hidden_rows from i18n.translations t                                                      -- must be 0
 where t.lease_until > now() and not i18n.entity_is_public(t.entity, t.entity_id);
select count(*) as parked_rows_of_public_entities from i18n.translations t                                          -- must be 0
 where t.next_attempt_at = 'infinity' and i18n.entity_is_public(t.entity, t.entity_id);
-- trusted = syndicated text written by sync: the car carries a source AND is held by that source's system account
select count(*) as untrusted_app_cars_marked_trusted from public.cars c                                             -- must be 0
  join i18n.sources s on s.entity = 'car' and s.entity_id = c.id
 where s.trusted and not exists (select 1 from public.listing_sources ls
                                  where ls.id = c.source_id and ls.system_account_id = c.seller_id);
-- a car in a sync slot (source_id) that its source's system account does not hold = a pre-claimed slot: investigate
select count(*) as sync_slots_held_by_other_accounts from public.cars c                                             -- must be 0
  join public.listing_sources ls on ls.id = c.source_id
 where c.seller_id <> ls.system_account_id;
select count(*) as llm_label_aliases from i18n.term_aliases a join i18n.terms t on t.id = a.term_id                  -- info
 where t.origin = 'llm';
-- moderation work not carried by any translation claim (drained by i18n_moderation_queue; 0 once settled)
select count(*) as moderation_backlog from i18n.sources s                                                           -- info
 where not s.trusted and s.moderation_attempts < 3
   and (s.moderation not in ('pass','flagged','blocked','skipped') or s.moderated_hash is distinct from s.mod_hash)
   and i18n.entity_is_public(s.entity, s.entity_id);
-- 4. Legacy stash taken once, before the enforce flip (spec 2.8): must be > 0 on the first run and never shrink
select entity, count(*) from i18n.legacy_text group by 1 order by 1;
-- 5. Content clock is not "migration time" for everything (B16): must show many distinct days
select date_trunc('day', content_updated_at) as day, count(*) from public.cars where status = 'active'
 group by 1 order by 1 desc limit 10;
-- 6. Progress / health (translation calls and moderation calls have separate daily caps)
select * from public.i18n_stats();
select day, calls, in_tokens, out_tokens, mod_calls from i18n.budget order by day desc limit 7;
-- authors closest to (or at) daily_moderation_cap_per_author today; at the cap their new content waits for tomorrow
select b.user_id, p.username, b.verdicts from i18n.mod_author_budget b left join public.profiles p on p.id = b.user_id
 where b.day = (now() at time zone 'utc')::date order by b.verdicts desc limit 10;
select key, value from i18n.settings order by key;
-- 7. Moderation in shadow mode: block rate per entity (gate before moderation_enforce=true: review every row)
select target_type, status, count(*) from public.ai_moderation group by 1, 2 order by 1, 2;
