-- Stub of the live Supabase schema (nkboeyveppapmxgfjqqb) relevant to i18n v2.
-- Columns/policies/grants copied from read-only introspection on 2026-10-12; listing_sources (system_account_id)
-- and admin_actions (target_type CHECK, policies) from the schema-only dump of 2026-10-14.
-- dealer_stores: columns from lib/types.ts DbDealerStore (not introspected); public read + the claimant policy of
-- claim-accounts.sql (browse-cars.sql reads it for the financing filter).
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema cron;
create table cron.job (jobid serial primary key, jobname text unique, schedule text, command text);
create or replace function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint language sql as $$
  insert into cron.job(jobname, schedule, command) values (p_name, p_schedule, p_command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
  returning jobid::bigint
$$;
create or replace function cron.unschedule(p_name text) returns boolean language sql as $$
  delete from cron.job where jobname = p_name returning true
$$;

create table public.profiles (
  id uuid primary key, username text not null default 'u', role text not null default 'user',
  is_system boolean not null default false, claimed_by uuid, banned boolean not null default false,
  languages text[] not null default '{}', account_type text not null default 'private', avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.listing_sources (
  id uuid primary key default gen_random_uuid(), key text not null unique, name text not null, base_url text not null,
  enabled boolean not null default true, system_account_id uuid not null references public.profiles(id),
  last_sync_at timestamptz, last_sync_status text, last_sync_detail jsonb, created_at timestamptz not null default now()
);
create table public.api_keys (id uuid primary key default gen_random_uuid());
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(), admin_id uuid not null references auth.users(id), action text not null,
  target_type text not null
    constraint admin_actions_target_type_check check (target_type = any (array['user','car','store','report'])),
  target_id uuid not null, detail text, created_at timestamptz not null default now()
);

create table public.cars (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, title_zh text not null, year integer not null, make text not null, model text not null, trim text,
  price integer not null, mileage integer not null, location text not null, location_zh text not null,
  image_url text, images text[] default '{}', fuel_type text not null default '汽油', transmission text not null default '自动',
  exterior_color text, interior_color text, drivetrain text, vin text, description text, description_zh text,
  seller_name text not null, features text[] default '{}', status text not null default 'active'
    check (status in ('active','sold','pending','removed')),
  views_count integer default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  phone text, lat double precision, lng double precision, favorites_count integer not null default 0,
  original_price integer, price_updated_at timestamptz, carfax_url text, carfax_summary text, expires_at timestamptz,
  source_id uuid references public.listing_sources(id), source_listing_id text, source_url text, last_seen_at timestamptz,
  owner_hidden boolean not null default false, other_i18n jsonb not null default '{}'::jsonb, source_images text[],
  external_id text, api_key_id uuid references public.api_keys(id) on delete set null
);
create table public.community_posts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
  type text not null check (type in ('review','showoff','discussion')), title text not null, content text not null,
  images text[] default '{}', car_id uuid references public.cars(id), make text, model text, year integer,
  tags text[] default '{}', likes_count integer default 0, comments_count integer default 0,
  status text default 'active' check (status in ('active','hidden','removed')),
  created_at timestamptz default now(), updated_at timestamptz default now(), other_i18n jsonb not null default '{}'::jsonb
);
create table public.post_comments (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id), parent_id uuid references public.post_comments(id),
  content text not null, likes_count integer default 0, created_at timestamptz default now(),
  other_i18n jsonb not null default '{}'::jsonb
);
create table public.comments (
  id uuid primary key default gen_random_uuid(), car_id uuid not null references public.cars(id) on delete cascade,
  user_id uuid not null references public.profiles(id), content text not null, created_at timestamptz default now(),
  other_i18n jsonb not null default '{}'::jsonb
);
create table public.qa_questions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), title text not null,
  content text not null, category text default 'general', tags text[] default '{}', answers_count integer default 0,
  views_count integer default 0, is_resolved boolean default false, accepted_answer_id uuid, status text default 'active',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.qa_answers (
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.qa_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id), content text not null, likes_count integer default 0,
  is_accepted boolean default false, created_at timestamptz default now()
);
create table public.dealer_reviews (
  id uuid primary key default gen_random_uuid(), dealer_id uuid not null, user_id uuid not null references public.profiles(id),
  rating smallint not null check (rating between 1 and 5), content text not null, created_at timestamptz not null default now()
);

create table public.dealer_stores (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, address text not null, zipcode text, lat double precision, lng double precision, phone text,
  wechat text, store_photos text[] not null default '{}', verification_status text not null default 'unverified',
  verification_submitted_at timestamptz, verification_reviewed_at timestamptz, verification_note text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger on_cars_updated before update on public.cars for each row execute function public.handle_updated_at();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.can_act_as(pid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select pid = auth.uid() or exists (select 1 from public.profiles where id = pid and claimed_by = auth.uid());
$$;
create or replace function public.increment_views(car_id uuid) returns void language plpgsql security definer as $$
begin update public.cars set views_count = views_count + 1 where id = car_id; end; $$;

alter table public.cars enable row level security;
create policy cars_select on public.cars for select using ((status = 'active') or (seller_id = auth.uid()));
create policy cars_insert on public.cars for insert with check (auth.uid() = seller_id);
create policy cars_update on public.cars for update using (auth.uid() = seller_id);
create policy cars_delete on public.cars for delete using (auth.uid() = seller_id);
create policy admin_manage_cars on public.cars for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy claimant_manage_cars on public.cars for all to authenticated using (public.can_act_as(seller_id)) with check (public.can_act_as(seller_id));

alter table public.community_posts enable row level security;
create policy posts_read on public.community_posts for select using (status = 'active');
create policy posts_insert on public.community_posts for insert to authenticated with check (auth.uid() = user_id);
create policy posts_update on public.community_posts for update to authenticated using (auth.uid() = user_id);
create policy posts_admin on public.community_posts for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.post_comments enable row level security;
create policy pc_read on public.post_comments for select using (true);
create policy pc_insert on public.post_comments for insert to authenticated with check (auth.uid() = user_id);
create policy pc_delete on public.post_comments for delete to authenticated using (auth.uid() = user_id);
create policy pc_admin on public.post_comments for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.comments enable row level security;
create policy c_read on public.comments for select using (true);
create policy c_insert on public.comments for insert with check (auth.uid() = user_id);

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select using (true);

alter table public.listing_sources enable row level security;
create policy admin_manage_listing_sources on public.listing_sources for all using (public.is_admin()) with check (public.is_admin());

alter table public.admin_actions enable row level security;
create policy admin_actions_admin_insert on public.admin_actions for insert with check (public.is_admin());
create policy admin_actions_admin_read on public.admin_actions for select using (public.is_admin());

alter table public.dealer_stores enable row level security;
create policy dealer_stores_select on public.dealer_stores for select using (true);
create policy claimant_manage_dealer_stores on public.dealer_stores for all to authenticated
  using (public.can_act_as(owner_id)) with check (public.can_act_as(owner_id));

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
-- Supabase default privileges in schema public (functions/tables created later get these grants)
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
