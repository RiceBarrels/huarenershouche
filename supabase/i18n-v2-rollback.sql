-- =====================================================================
-- supabase/i18n-v2-rollback.sql — EMERGENCY detach (keeps ALL data). Use only when the v2 triggers themselves
-- misbehave; the normal fast rollback is a Vercel instant rollback + the SQL-editor steps below.
--
-- Fast rollback (Vercel instant rollback to a pre-v2 deployment), in the SQL editor:
--   select public.i18n_admin_set('enforce', 'false'::jsonb);
--   select public.i18n_admin_set('moderation_enforce', 'false'::jsonb);
--   -- park flags of target types the pre-v2 admin page cannot render (its 'AI 审核' tab would crash on them):
--   update public.ai_moderation set status = 'shadow', context = coalesce(context, '{}'::jsonb) || '{"parked": true}'::jsonb
--    where status = 'pending' and target_type not in ('car', 'post', 'car_comment', 'post_comment');
-- Run the same parking step when this emergency detach goes together with an instant rollback.
-- Once v2 web code is live again, un-park: a parked flag still waiting for review returns to 'pending'; flags
-- reviewed meanwhile keep their review status (the v2 admin page lists parked flags as pending, and
-- i18n_admin_restore_moderation restores them like pending ones). A flag parked from a null context gets null back:
--   update public.ai_moderation set status = case when status = 'shadow' then 'pending' else status end,
--          context = nullif(context - 'parked', '{}'::jsonb)
--    where context ->> 'parked' = 'true';
--   select public.i18n_admin_set('moderation_enforce', 'true'::jsonb);   -- only if it was on before
--
-- While detached, a minimal mapper keeps cars.description_original in step with legacy writers (old code writes
-- description / description_zh / features), so re-attaching loses no author edit. Re-attach:
--   1. re-run supabase/i18n-v2.sql (drops the mapper, re-creates the triggers and the hourly sweep);
--   2. select i18n.sweep(1000000);
--      re-hashes every drifted row. Text written while detached has an unknown writer, so it is never trusted:
--      it is moderated again (also syndicated cars: the next sync write that changes the text restores trust).
--      The sweep also re-syncs feature / topic link rows whose set differs from features_original / tags + #hashtags;
--   3. full link-row re-sync (covers spelling-only changes the set comparison does not see):
--      do $$ begin
--        perform i18n.sync_car_features(c.id, c.features_original) from public.cars c;
--        perform i18n.sync_post_tags(p.id, p.tags, p.title, p.content) from public.community_posts p;
--      end $$;
-- =====================================================================
begin;
insert into i18n.settings (key, value) values ('enforce', 'false') on conflict (key) do update set value = 'false', updated_at = now();
drop trigger if exists i18n_guard_ins on public.cars;
drop trigger if exists i18n_guard_upd on public.cars;
drop trigger if exists i18n_sync_ins on public.cars;
drop trigger if exists i18n_sync_upd on public.cars;
drop trigger if exists i18n_guard on public.community_posts;
drop trigger if exists i18n_sync on public.community_posts;
drop trigger if exists i18n_guard on public.ai_moderation;
do $$ declare t text; begin
  foreach t in array array['post_comments','comments','qa_questions','qa_answers','dealer_reviews'] loop
    execute format('drop trigger if exists i18n_guard on public.%I', t);
    execute format('drop trigger if exists i18n_sync on public.%I', t);
  end loop; end $$;

-- Minimal legacy mapper (same mapping rule as i18n.cars_before section 1; nothing else)
create or replace function i18n.legacy_map_only() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cls text := i18n.writer_class();
begin
  if tg_op = 'INSERT' then
    if new.description_original is null then
      new.description_original := case when cls in ('service','system')
        then coalesce(nullif(btrim(new.description), ''), nullif(btrim(new.description_zh), ''))
        else coalesce(nullif(btrim(new.description_zh), ''), nullif(btrim(new.description), '')) end;
    end if;
    if coalesce(cardinality(new.features_original), 0) = 0 then new.features_original := coalesce(new.features, '{}'); end if;
    return new;
  end if;
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
  return new;
end $$;
drop trigger if exists i18n_legacy_map on public.cars;
create trigger i18n_legacy_map before insert or update on public.cars
  for each row execute function i18n.legacy_map_only();

select cron.unschedule(jobname) from cron.job where jobname in ('i18n-sweep', 'i18n-budget-purge');
commit;
-- Note: with i18n_guard dropped on ai_moderation, the OLD /api/moderate code starts hiding content again
-- (as designed before v2). Keep public.ai_moderation; nothing else references i18n.* from public code.
