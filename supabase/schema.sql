-- ============================================================
-- ZAP POS: Supabase setup for the landing page + admin panel
-- (content, leads, payments, analytics)
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to run again (it only creates what's missing).
-- ============================================================

-- 1) Site content: one row per page; the landing page is id = 'landing'.
create table if not exists public.site_content (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

-- 2) Admins: only users listed here can change content.
create table if not exists public.admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- 3) Keep updated_at / updated_by current on every save.
create or replace function public.site_content_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch
  before insert or update on public.site_content
  for each row execute function public.site_content_touch();

-- 4) Row Level Security: everyone may READ the page content; only admins may WRITE it.
alter table public.site_content enable row level security;
alter table public.admins enable row level security;

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
  on public.site_content for select
  using (true);

drop policy if exists "Admins can add site content" on public.site_content;
create policy "Admins can add site content"
  on public.site_content for insert to authenticated
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content"
  on public.site_content for update to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can see their own admin row" on public.admins;
create policy "Admins can see their own admin row"
  on public.admins for select to authenticated
  using (user_id = auth.uid());

-- Helper used by the policies below: is the signed-in user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
$$;

-- ============================================================
-- 6) Leads: "Book a free demo" requests from the website (+ ones you add yourself).
--    Visitors can only ADD a lead (and only these columns); only admins can read/change.
-- ============================================================
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 2 and 80),
  phone       text not null check (char_length(phone) between 7 and 20),
  shop        text check (char_length(shop) <= 100),
  city        text check (char_length(city) <= 60),
  plan        text check (char_length(plan) <= 40),
  branches    int  check (branches between 1 and 999),
  message     text check (char_length(message) <= 1000),
  source      text check (char_length(source) <= 120),
  status      text not null default 'new' check (status in ('new', 'contacted', 'demo', 'won', 'lost')),
  follow_up   date,
  notes       text
);
create index if not exists leads_created_at on public.leads (created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
revoke all on public.leads from anon;
grant insert (name, phone, shop, city, plan, branches, message, source) on public.leads to anon;

drop policy if exists "Visitors can send a lead" on public.leads;
create policy "Visitors can send a lead" on public.leads for insert to anon
  with check (status = 'new' and notes is null and follow_up is null);
drop policy if exists "Admins manage leads" on public.leads;
create policy "Admins manage leads" on public.leads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 7) Payments: what each customer paid you (recorded by you in the admin).
--    A customer is a lead marked "won". Admins only.
-- ============================================================
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lead_id     uuid not null references public.leads (id) on delete restrict,
  amount      int  not null check (amount > 0),
  paid_on     date not null default current_date,
  method      text not null check (method in ('cash', 'bank', 'jazzcash', 'easypaisa', 'card', 'other')),
  plan        text check (char_length(plan) <= 40),
  billing     text not null default 'monthly' check (billing in ('monthly', 'yearly', 'setup', 'other')),
  branches    int  not null default 1 check (branches between 1 and 999),
  paid_until  date,
  reference   text check (char_length(reference) <= 80),
  note        text check (char_length(note) <= 500)
);
create index if not exists payments_paid_on on public.payments (paid_on desc);
create index if not exists payments_lead on public.payments (lead_id);

alter table public.payments enable row level security;
revoke all on public.payments from anon;
drop policy if exists "Admins manage payments" on public.payments;
create policy "Admins manage payments" on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 8) Events: anonymous visit / click counts for the Analytics page.
--    No cookies, no names: a random browser id, device type and referrer site only.
-- ============================================================
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  type        text not null check (type in ('visit', 'click', 'view')),
  name        text check (char_length(name) <= 40),
  visitor     text check (char_length(visitor) <= 40),
  device      text check (device in ('mobile', 'tablet', 'desktop')),
  referrer    text check (char_length(referrer) <= 120),
  campaign    text check (char_length(campaign) <= 80)
);
create index if not exists events_created_at on public.events (created_at desc);

alter table public.events enable row level security;
revoke all on public.events from anon;
grant insert (type, name, visitor, device, referrer, campaign) on public.events to anon;

drop policy if exists "Visitors can send events" on public.events;
create policy "Visitors can send events" on public.events for insert to anon with check (true);
drop policy if exists "Admins read events" on public.events;
create policy "Admins read events" on public.events for select to authenticated using (public.is_admin());
drop policy if exists "Admins delete events" on public.events;
create policy "Admins delete events" on public.events for delete to authenticated using (public.is_admin());

-- Analytics summary for the admin (runs with the caller's rights, so RLS still applies).
-- Days are counted in Pakistan time.
create or replace function public.admin_stats(days int default 30)
returns jsonb language sql stable security invoker set search_path = public as $$
  with
  bounds as (
    select (now() at time zone 'Asia/Karachi')::date - (days - 1) as d0,
           (now() at time zone 'Asia/Karachi')::date as d1
  ),
  ev as (
    select e.*, (e.created_at at time zone 'Asia/Karachi')::date as d
    from events e, bounds b
    where e.created_at >= (b.d0 - days)::timestamp at time zone 'Asia/Karachi'
  ),
  cur  as (select ev.* from ev, bounds b where ev.d >= b.d0),
  prev as (select ev.* from ev, bounds b where ev.d < b.d0),
  ld as (
    select (l.created_at at time zone 'Asia/Karachi')::date as d
    from leads l, bounds b
    where l.created_at >= (b.d0 - days)::timestamp at time zone 'Asia/Karachi'
  ),
  series as (select generate_series(b.d0, b.d1, interval '1 day')::date as d from bounds b)
  select jsonb_build_object(
    'days', days,
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', s.d,
        'visits', (select count(*) from cur where cur.d = s.d and cur.type = 'visit'),
        'visitors', (select count(distinct visitor) from cur where cur.d = s.d and cur.type = 'visit'),
        'leads', (select count(*) from ld where ld.d = s.d)
      ) order by s.d), '[]'::jsonb) from series s),
    'totals', jsonb_build_object(
      'visits',        (select count(*) from cur where type = 'visit'),
      'visitors',      (select count(distinct visitor) from cur where type = 'visit'),
      'prevVisits',    (select count(*) from prev where type = 'visit'),
      'prevVisitors',  (select count(distinct visitor) from prev where type = 'visit'),
      'leads',         (select count(*) from ld, bounds b where ld.d >= b.d0),
      'prevLeads',     (select count(*) from ld, bounds b where ld.d < b.d0),
      'sawPricing',    (select count(distinct visitor) from cur where type = 'view' and name = 'pricing'),
      'clickedCta',    (select count(distinct visitor) from cur where type = 'click' and name in ('demo', 'whatsapp', 'download', 'call'))
    ),
    'clicks',    (select coalesce(jsonb_object_agg(name, n), '{}'::jsonb) from (select name, count(*) n from cur where type = 'click' group by name) x),
    'devices',   (select coalesce(jsonb_object_agg(device, n), '{}'::jsonb) from (select device, count(distinct visitor) n from cur where type = 'visit' and device is not null group by device) x),
    'referrers', (select coalesce(jsonb_agg(jsonb_build_object('name', referrer, 'n', n) order by n desc), '[]'::jsonb) from (select coalesce(referrer, 'Direct') referrer, count(*) n from cur where type = 'visit' group by 1 order by 2 desc limit 8) x),
    'campaigns', (select coalesce(jsonb_agg(jsonb_build_object('name', campaign, 'n', n) order by n desc), '[]'::jsonb) from (select campaign, count(*) n from cur where type = 'visit' and campaign is not null group by 1 order by 2 desc limit 8) x)
  )
$$;
revoke execute on function public.admin_stats(int) from public, anon;
grant execute on function public.admin_stats(int) to authenticated;

-- ============================================================
-- 9) Make yourself the admin (do this AFTER creating your user in
--    Authentication → Users → Add user, with "Auto Confirm User" on).
--    Replace the email below, then run just this statement:
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict do nothing;
-- ============================================================
