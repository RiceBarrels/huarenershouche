-- =====================================================================
-- supabase/i18n-v2-cleanup.sql — Phase C (>= 14 days after enforce=true AND after the v2 native build ships;
-- see spec 10.1 step 13). Idempotent.
-- =====================================================================
begin;
select set_config('i18n.writer', 'pipeline', true);
update public.cars            set other_i18n = '{}'::jsonb where other_i18n <> '{}'::jsonb;
update public.community_posts set other_i18n = '{}'::jsonb where other_i18n <> '{}'::jsonb;
update public.post_comments   set other_i18n = '{}'::jsonb where other_i18n <> '{}'::jsonb;
update public.comments        set other_i18n = '{}'::jsonb where other_i18n <> '{}'::jsonb;
alter table public.cars            validate constraint cars_description_original_len;
alter table public.community_posts validate constraint community_posts_text_len;
alter table public.post_comments   validate constraint post_comments_text_len;
alter table public.post_comments   validate constraint post_comments_reply_to_name_len;
alter table public.comments        validate constraint comments_text_len;
alter table public.qa_questions    validate constraint qa_questions_text_len;
alter table public.qa_answers      validate constraint qa_answers_text_len;
alter table public.dealer_reviews  validate constraint dealer_reviews_text_len;
commit;
-- i18n.legacy_text (the pre-migration snapshot) is kept until Phase D for forensics / re-import.
-- Phase D (legacy native builds below 2 % of sessions, shims deleted), in this order:
--   1. Re-apply public.analytics_car_info and public.analytics_breakdown_impl from supabase/analytics.sql
--      (create or replace). The deployed versions still read cars.other_i18n; neither body is dependency-tracked,
--      so dropping the column would succeed and break the admin / seller analytics at call time.
--   2. Remove old/new.other_i18n from the i18n_guard_upd WHEN list and the other_i18n lines of the guards
--      (cars_before, posts_before, ugc_before) in i18n-v2.sql, and the `- 'other_i18n'` key strip of browse_cars in
--      browse-cars.sql; re-apply both files.
--   3. Pre-check, must return no rows (any row is a function that still reads or names the column):
--        select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--         where n.nspname in ('public', 'i18n') and p.prosrc ilike '%other_i18n%';
--   4. Drop other_i18n on cars, community_posts, post_comments and comments; then
--      `drop table if exists i18n.legacy_text`.
