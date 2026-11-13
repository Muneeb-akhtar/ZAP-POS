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
returns trigger language plpgsql set search_path = '' as $$
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
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ============================================================
-- 6) Leads: "Book a free demo" requests from the website (+ ones you add yourself).
--    One lead per mobile number. Visitors can't touch the table: the demo form calls
--    submit_lead() below. Only admins can read/change leads.
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

-- Same shop, same number: 0300-1234567, +92 300 1234567 and 923001234567 all become 03001234567.
create or replace function public.phone_key(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when d ~ '^0092[0-9]{10}$' then '0' || substr(d, 5)
    when d ~ '^92[0-9]{10}$'   then '0' || substr(d, 3)
    when d ~ '^3[0-9]{9}$'     then '0' || d
    else d end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) x
$$;
alter table public.leads add column if not exists phone_key text generated always as (public.phone_key(phone)) stored;
create unique index if not exists leads_phone_key on public.leads (phone_key);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
revoke all on public.leads from anon;
drop policy if exists "Visitors can send a lead" on public.leads;
drop policy if exists "Admins manage leads" on public.leads;
create policy "Admins manage leads" on public.leads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Customer accounts: a shop that signs up (website /account/ or the POS app) is linked to its lead.
alter table public.leads add column if not exists email text check (char_length(email) <= 120);
alter table public.leads add column if not exists user_id uuid unique references auth.users (id) on delete set null;
alter table public.leads add column if not exists signed_up_at timestamptz;
create unique index if not exists leads_email_key on public.leads (lower(email)) where email is not null;

-- The website's demo form. A repeat request (same email, or same mobile number) never makes a
-- second lead: it fills in what the lead was missing, adds a dated line to your notes, and moves
-- a Lost lead back to New. Visitors get the same "sent" answer either way and can't read anything.
drop function if exists public.submit_lead(text, text, text, text, text, int, text, text);
create or replace function public.submit_lead(
  p_name text, p_phone text, p_email text default null, p_shop text default null, p_city text default null,
  p_plan text default null, p_branches int default null, p_message text default null, p_source text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text := nullif(lower(trim(p_email)), '');
  v_id uuid;
begin
  select id into v_id from public.leads
   where (v_email is not null and lower(email) = v_email) or phone_key = public.phone_key(p_phone)
   order by (v_email is not null and lower(email) = v_email) desc
   limit 1 for update;
  if v_id is null then
    insert into public.leads (name, phone, email, shop, city, plan, branches, message, source)
    values (p_name, p_phone, v_email, p_shop, p_city, p_plan, p_branches, p_message, p_source);
  else
    update public.leads l set
      email    = coalesce(l.email, v_email),
      shop     = coalesce(l.shop, p_shop),
      city     = coalesce(l.city, p_city),
      plan     = coalesce(l.plan, p_plan),
      branches = coalesce(l.branches, p_branches),
      message  = coalesce(l.message, p_message),
      status   = case when l.status = 'lost' then 'new' else l.status end,
      notes    = left(concat_ws(E'\n', l.notes, format('Sent the demo form again on %s%s%s',
                   to_char(now() at time zone 'Asia/Karachi', 'DD Mon YYYY'),
                   ' · plan: ' || p_plan, ' · "' || p_message || '"')), 4000)
    where l.id = v_id;
  end if;
exception when unique_violation then
  null; -- the same shop was saved a moment ago by a parallel request: nothing to add
end $$;
revoke all on function public.submit_lead(text, text, text, text, text, text, int, text, text) from public, authenticated;
grant execute on function public.submit_lead(text, text, text, text, text, text, int, text, text) to anon;

-- ============================================================
-- 7) Payments: what each customer paid you (recorded by you in the admin).
--    A customer is a lead marked "won". Admins only.
--    No double entries, and one plan at a time: a shop's monthly/yearly periods
--    (starts_on → paid_until) can never overlap, so it can't be billed twice for the same days.
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

create extension if not exists btree_gist with schema extensions;
alter table public.payments add column if not exists starts_on date;
alter table public.payments drop constraint if exists payments_period;
alter table public.payments add constraint payments_period check
  (billing not in ('monthly', 'yearly') or (starts_on is not null and paid_until > starts_on));
alter table public.payments drop constraint if exists payments_no_overlap;
alter table public.payments add constraint payments_no_overlap exclude using gist
  (lead_id with =, daterange(starts_on, paid_until) with &&) where (billing in ('monthly', 'yearly'));
create unique index if not exists payments_same_payment on public.payments (lead_id, paid_on, amount, billing);
create unique index if not exists payments_reference on public.payments (method, lower(reference)) where reference is not null;

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
-- 10) Customer accounts. Sign-up = Supabase Auth email + password, with the shop details in
--     the user's metadata: { name, phone, shop, city }. A trigger links the new account to the
--     lead with the same email (or, failing that, the same mobile number), else creates the lead.
--     A number that already belongs to another account is refused (the sign-up fails).
--     Customers never get table access: they read their own account through my_account() only.
-- ============================================================
create or replace function public.link_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone text := nullif(trim(m->>'phone'), '');
  v_id uuid;
  v_user uuid;
begin
  select id, user_id into v_id, v_user from public.leads
   where lower(email) = lower(new.email) or (v_phone is not null and phone_key = public.phone_key(v_phone))
   order by (lower(email) = lower(new.email)) desc nulls last
   limit 1 for update;
  if v_id is not null and v_user is not null and v_user <> new.id then
    raise exception 'ZAP_ACCOUNT_EXISTS: this shop already has an account';
  end if;
  if v_id is null then
    if v_phone is null then return new; end if; -- e.g. the owner's own login made in the dashboard
    insert into public.leads (name, phone, email, shop, city, source, user_id, signed_up_at)
    values (coalesce(nullif(trim(m->>'name'), ''), split_part(new.email, '@', 1)), v_phone, lower(new.email),
            nullif(trim(m->>'shop'), ''), nullif(trim(m->>'city'), ''), 'Sign-up', new.id, now());
  else
    update public.leads l set
      user_id = new.id, signed_up_at = now(),
      email = coalesce(l.email, lower(new.email)),
      shop  = coalesce(l.shop, nullif(trim(m->>'shop'), '')),
      city  = coalesce(l.city, nullif(trim(m->>'city'), '')),
      status = case when l.status = 'lost' then 'new' else l.status end
    where l.id = v_id;
  end if;
  return new;
end $$;
revoke all on function public.link_signup() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.link_signup();

-- The signed-in customer's own account: shop details, current plan and payment history.
-- Returns null for a login that isn't linked to a shop (e.g. the admin). Also used by the POS app.
create or replace function public.my_account()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', l.name, 'shop', l.shop, 'city', l.city, 'phone', l.phone, 'email', l.email, 'since', l.signed_up_at,
    'plan', cur.plan, 'branches', cur.branches, 'billing', cur.billing, 'paid_until', cur.paid_until,
    'active', coalesce(cur.paid_until >= (now() at time zone 'Asia/Karachi')::date, false),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object('paid_on', p.paid_on, 'amount', p.amount, 'method', p.method, 'plan', p.plan,
               'billing', p.billing, 'branches', p.branches, 'starts_on', p.starts_on, 'paid_until', p.paid_until)
             order by p.paid_on desc, p.created_at desc)
      from public.payments p where p.lead_id = l.id), '[]'::jsonb)
  )
  from public.leads l
  left join lateral (
    select p.plan, p.branches, p.billing, p.paid_until from public.payments p
    where p.lead_id = l.id and p.billing in ('monthly', 'yearly')
    order by p.paid_until desc limit 1
  ) cur on true
  where l.user_id = auth.uid()
$$;
revoke all on function public.my_account() from public, anon;
grant execute on function public.my_account() to authenticated;

-- ============================================================
-- 9) Make yourself the admin (do this AFTER creating your user in
--    Authentication → Users → Add user, with "Auto Confirm User" on).
--    Replace the email below, then run just this statement:
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict do nothing;
-- ============================================================
