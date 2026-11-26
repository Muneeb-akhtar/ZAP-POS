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
-- 11) Plan codes: the signed code a shop pastes into ZAP POS (Settings > Plan) to unlock what it paid for
--     (counters allowed, paid until). Made by the admin panel through the edge function
--     supabase/functions/make-plan-code, which holds ZAP's secret signing key (Edge Function secret
--     PLAN_SIGNING_KEY). This table only keeps a record of every code made. Admins only; nothing is deleted.
--     Each shop's ZAP POS branch code is remembered on the lead, so the next code is quicker to make.
-- ============================================================
alter table public.leads add column if not exists pos_branch_code text
  check (pos_branch_code ~ '^[A-Z0-9]{2,20}$');

create table if not exists public.plan_codes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lead_id     uuid not null references public.leads (id) on delete restrict,
  branch_code text not null check (branch_code ~ '^[A-Z0-9]{2,20}$'),
  counters    int  not null check (counters between 1 and 50),
  paid_until  date not null,
  code        text not null unique,
  made_by     uuid references auth.users (id) default auth.uid()
);
create index if not exists plan_codes_lead on public.plan_codes (lead_id, created_at desc);
alter table public.plan_codes enable row level security;
revoke all on public.plan_codes from anon;
drop policy if exists "Admins read plan codes" on public.plan_codes;
create policy "Admins read plan codes" on public.plan_codes for select to authenticated using (public.is_admin());
drop policy if exists "Admins add plan codes" on public.plan_codes;
create policy "Admins add plan codes" on public.plan_codes for insert to authenticated with check (public.is_admin());

-- ============================================================
-- 12) Releases: new ZAP POS versions for the shops' PCs (admin panel → Releases).
--     The exe is stored in the public bucket 'releases' in parts of up to 40 MB (Supabase's upload limit is 50 MB).
--     Each release is signed (edge function sign-release, key PLAN_SIGNING_KEY) over "ZAPREL1|<version>|<sha256>",
--     and ZAP POS installs only a file whose SHA-256 and signature match. A shop's main PC asks latest_release()
--     (as a visitor, no login) and reports what it installed with report_release(). Admins see everything.
-- ============================================================
create table if not exists public.releases (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  version       text not null unique check (version ~ '^\d+\.\d+\.\d+$'),
  notes         text check (char_length(notes) <= 2000),
  sha256        text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size          bigint not null check (size > 0),
  parts         text[] not null check (cardinality(parts) between 1 and 20),
  signature     text not null,
  target_branch text check (target_branch ~ '^[A-Z0-9]{2,20}$'),   -- null = every shop
  published     boolean not null default false,
  published_at  timestamptz,
  made_by       uuid references auth.users (id) default auth.uid()
);
alter table public.releases enable row level security;
revoke all on public.releases from anon;
drop policy if exists "Admins manage releases" on public.releases;
create policy "Admins manage releases" on public.releases for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.release_installs (
  branch_code text not null check (branch_code ~ '^[A-Z0-9]{2,20}$'),
  version     text not null,
  seen_at     timestamptz not null default now(),
  primary key (branch_code, version)
);
alter table public.release_installs enable row level security;
revoke all on public.release_installs from anon;
drop policy if exists "Admins read installs" on public.release_installs;
create policy "Admins read installs" on public.release_installs for select to authenticated using (public.is_admin());

-- What a shop's main PC should have: the newest published release for every shop, or for this shop only.
create or replace function public.latest_release(p_branch text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('version', r.version, 'notes', r.notes, 'sha256', r.sha256, 'size', r.size,
                            'parts', to_jsonb(r.parts), 'signature', r.signature)
  from public.releases r
  where r.published and (r.target_branch is null or r.target_branch = upper(trim(p_branch)))
  order by string_to_array(r.version, '.')::int[] desc
  limit 1
$$;
revoke all on function public.latest_release(text) from public;
grant execute on function public.latest_release(text) to anon, authenticated;

-- A main PC says which version it now runs (shown as "x of y shops updated"). Only real versions are accepted.
create or replace function public.report_release(p_branch text, p_version text)
returns void language sql security definer set search_path = public as $$
  insert into public.release_installs (branch_code, version)
  select upper(trim(p_branch)), p_version
  where upper(trim(p_branch)) ~ '^[A-Z0-9]{2,20}$' and exists (select 1 from public.releases r where r.version = p_version)
  on conflict (branch_code, version) do update set seen_at = now()
$$;
revoke all on function public.report_release(text, text) from public;
grant execute on function public.report_release(text, text) to anon, authenticated;

-- the files: anyone may download (they are signed), only admins may upload
insert into storage.buckets (id, name, public, file_size_limit)
values ('releases', 'releases', true, 45 * 1024 * 1024)
on conflict (id) do update set public = true, file_size_limit = 45 * 1024 * 1024;
drop policy if exists "Admins upload releases" on storage.objects;
create policy "Admins upload releases" on storage.objects for insert to authenticated
  with check (bucket_id = 'releases' and public.is_admin());
drop policy if exists "Admins replace releases" on storage.objects;
create policy "Admins replace releases" on storage.objects for update to authenticated
  using (bucket_id = 'releases' and public.is_admin());
-- the admin page uploads with upsert (so a retried part replaces itself); Supabase needs a select rule for that
drop policy if exists "Admins read releases" on storage.objects;
create policy "Admins read releases" on storage.objects for select to authenticated
  using (bucket_id = 'releases' and public.is_admin());

-- ============================================================
-- 13) Licence keys (Plans page): each key has a start, an end and a status.
--     A new key for a shop replaces its old one (status 'replaced'); 'revoked' switches a key off early.
--     A shop's main PC asks licence_status() every 30 minutes: it gets told when its key was revoked, and it
--     receives the shop's newest key by itself (only a PC that already holds one of that shop's keys can ask).
-- ============================================================
alter table public.plan_codes add column if not exists starts_on date;
alter table public.plan_codes add column if not exists status text not null default 'active';
alter table public.plan_codes drop constraint if exists plan_codes_status;
alter table public.plan_codes add constraint plan_codes_status check (status in ('active', 'replaced', 'revoked'));
alter table public.plan_codes add column if not exists changed_at timestamptz;
create index if not exists plan_codes_branch on public.plan_codes (branch_code, created_at desc);

-- a new key replaces the shop's earlier active keys
create or replace function public.plan_codes_replace() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.plan_codes set status = 'replaced', changed_at = now()
  where branch_code = new.branch_code and status = 'active' and id <> new.id;
  return new;
end $$;
revoke all on function public.plan_codes_replace() from public, anon, authenticated;
drop trigger if exists plan_codes_replace on public.plan_codes;
create trigger plan_codes_replace after insert on public.plan_codes for each row execute function public.plan_codes_replace();

-- admins may revoke (or restore) a key; nothing is ever deleted
drop policy if exists "Admins change plan codes" on public.plan_codes;
create policy "Admins change plan codes" on public.plan_codes for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- asked by a shop's main PC with the key it holds now
create or replace function public.licence_status(p_branch text, p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  with mine as (
    select * from public.plan_codes
    where branch_code = upper(trim(p_branch)) and replace(upper(code), '-', '') = replace(upper(trim(p_code)), '-', '')
  ), newest as (
    select code from public.plan_codes
    where branch_code = upper(trim(p_branch)) and status = 'active'
    order by created_at desc limit 1
  )
  select case when not exists (select 1 from mine) then jsonb_build_object('status', 'unknown')
              else jsonb_build_object('status', (select status from mine limit 1), 'newest', (select code from newest)) end
$$;
revoke all on function public.licence_status(text, text) from public;
grant execute on function public.licence_status(text, text) to anon, authenticated;

-- ============================================================
-- 9) Make yourself the admin (do this AFTER creating your user in
--    Authentication → Users → Add user, with "Auto Confirm User" on).
--    Replace the email below, then run just this statement:
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict do nothing;
-- ============================================================

-- ============================================================
-- 14) Bills (admin → Bills): bills and estimates you send to shops, and the payment proof they send back.
--     Numbers come from one sequence and never repeat (BIL-1001, EST-1002). Nothing is deleted: a wrong bill is
--     cancelled. The same bill can't be made twice (same shop, kind, amount, issue date and description).
--     Status: unpaid → proof (shop sent a payment proof, you check it) → paid; or cancelled.
--     Late / upcoming are worked out from the dates. Proof files: private bucket 'bill-proofs', admins only.
-- ============================================================
create sequence if not exists public.bills_no_seq start 1001;
create table if not exists public.bills (
  id         uuid primary key default gen_random_uuid(),
  no         bigint not null unique default nextval('public.bills_no_seq'),
  kind       text not null default 'bill' check (kind in ('bill', 'estimate')),
  lead_id    uuid not null references public.leads(id) on delete restrict,
  title      text not null check (length(trim(title)) between 2 and 200),
  amount     integer not null check (amount > 0),
  issued_on  date not null default current_date,
  due_on     date not null,
  status     text not null default 'unpaid' check (status in ('unpaid', 'proof', 'paid', 'cancelled')),
  proof_path text,
  paid_on    date,
  note       text,
  created_at timestamptz not null default now(),
  made_by    uuid default auth.uid(),
  check (due_on >= issued_on),
  check ((status = 'paid') = (paid_on is not null))
);
create unique index if not exists bills_same_bill on public.bills (lead_id, kind, amount, issued_on, lower(trim(title))) where status <> 'cancelled';
alter table public.bills enable row level security;
revoke all on public.bills from anon;
drop policy if exists "Admins read bills" on public.bills;
create policy "Admins read bills" on public.bills for select to authenticated using (public.is_admin());
drop policy if exists "Admins add bills" on public.bills;
create policy "Admins add bills" on public.bills for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins change bills" on public.bills;
create policy "Admins change bills" on public.bills for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant usage on sequence public.bills_no_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('bill-proofs', 'bill-proofs', false, 8 * 1024 * 1024)
on conflict (id) do nothing;
drop policy if exists "Admins read bill proofs" on storage.objects;
create policy "Admins read bill proofs" on storage.objects for select to authenticated using (bucket_id = 'bill-proofs' and public.is_admin());
drop policy if exists "Admins upload bill proofs" on storage.objects;
create policy "Admins upload bill proofs" on storage.objects for insert to authenticated with check (bucket_id = 'bill-proofs' and public.is_admin());
drop policy if exists "Admins replace bill proofs" on storage.objects;
create policy "Admins replace bill proofs" on storage.objects for update to authenticated using (bucket_id = 'bill-proofs' and public.is_admin());

-- ============================================================
-- 15) Team (admin → Team): who can sign in to the admin. Admins see every admin with their email and last
--     sign-in; an admin adds another by the email of an account that already exists (it must sign up first)
--     and can remove anyone but themselves, so the panel always keeps at least one admin.
-- ============================================================
create or replace function public.admin_team()
returns table (user_id uuid, email text, added_at timestamptz, last_sign_in timestamptz, me boolean)
language sql stable security definer set search_path = public as $$
  select a.user_id, u.email::text, a.created_at, u.last_sign_in_at, a.user_id = auth.uid()
  from public.admins a join auth.users u on u.id = a.user_id
  where public.is_admin()
  order by a.created_at
$$;
revoke all on function public.admin_team() from public, anon;
grant execute on function public.admin_team() to authenticated;

create or replace function public.add_admin(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not public.is_admin() then raise exception 'Only an admin can add admins'; end if;
  select id into v from auth.users where lower(email) = lower(trim(p_email));
  if v is null then return 'no_account'; end if;
  insert into public.admins (user_id) values (v) on conflict do nothing;
  return case when found then 'added' else 'already' end;
end $$;
revoke all on function public.add_admin(text) from public, anon;
grant execute on function public.add_admin(text) to authenticated;

create or replace function public.remove_admin(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can remove admins'; end if;
  if p_user = auth.uid() then return 'self'; end if;
  delete from public.admins where user_id = p_user;
  return 'removed';
end $$;
revoke all on function public.remove_admin(uuid) from public, anon;
grant execute on function public.remove_admin(uuid) to authenticated;

-- ============================================================
-- 16) Help desk (admin → Help desk): requests from shops. Shops send them through send_help_request()
--     (ZAP POS Support screen or the website, no login); they can't read anything back. The same message from
--     the same number within an hour is kept once. Admins read, reply (notes for your records) and close.
-- ============================================================
create table if not exists public.help_requests (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id    uuid references public.leads(id) on delete set null,
  shop       text,
  name       text not null check (length(trim(name)) between 1 and 120),
  phone      text not null check (length(trim(phone)) between 7 and 30),
  branch_code text,
  topic      text not null default 'other' check (topic in ('billing', 'setup', 'printer', 'licence', 'bug', 'other')),
  message    text not null check (length(trim(message)) between 3 and 4000),
  status     text not null default 'open' check (status in ('open', 'waiting', 'solved')),
  priority   text not null default 'normal' check (priority in ('normal', 'urgent')),
  reply      text,
  updated_at timestamptz not null default now()
);
alter table public.help_requests enable row level security;
revoke all on public.help_requests from anon;
drop policy if exists "Admins manage help requests" on public.help_requests;
create policy "Admins manage help requests" on public.help_requests for select to authenticated using (public.is_admin());
drop policy if exists "Admins update help requests" on public.help_requests;
create policy "Admins update help requests" on public.help_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins add help requests" on public.help_requests;
create policy "Admins add help requests" on public.help_requests for insert to authenticated with check (public.is_admin());

create or replace function public.send_help_request(p_name text, p_phone text, p_message text, p_topic text default 'other',
                                                    p_shop text default null, p_branch text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_key text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
begin
  if length(v_key) < 7 or length(trim(coalesce(p_message, ''))) < 3 then return 'missing'; end if;
  if exists (select 1 from public.help_requests h where right(regexp_replace(h.phone, '\D', '', 'g'), 10) = v_key
             and trim(h.message) = trim(p_message) and h.created_at > now() - interval '1 hour') then return 'sent'; end if;
  insert into public.help_requests (lead_id, shop, name, phone, branch_code, topic, message)
  values ((select l.id from public.leads l where right(l.phone_key, 10) = v_key limit 1), nullif(trim(p_shop), ''), trim(p_name), trim(p_phone),
          nullif(upper(trim(p_branch)), ''), case when p_topic in ('billing', 'setup', 'printer', 'licence', 'bug') then p_topic else 'other' end, trim(p_message));
  return 'sent';
end $$;
revoke all on function public.send_help_request(text, text, text, text, text, text) from public;
grant execute on function public.send_help_request(text, text, text, text, text, text) to anon, authenticated;

-- ============================================================
-- 17) System health (admin → System health): how big each table is, the newest row in each, storage used per
--     bucket, the database size, and the shops' ZAP POS versions. Admins only; read-only.
-- ============================================================
create or replace function public.admin_health()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'checked_at', now(),
    'db_bytes', pg_database_size(current_database()),
    'tables', jsonb_build_array(
      jsonb_build_object('name', 'leads', 'label', 'Leads', 'rows', (select count(*) from leads), 'newest', (select max(created_at) from leads)),
      jsonb_build_object('name', 'payments', 'label', 'Payments', 'rows', (select count(*) from payments), 'newest', (select max(created_at) from payments)),
      jsonb_build_object('name', 'bills', 'label', 'Bills and estimates', 'rows', (select count(*) from bills), 'newest', (select max(created_at) from bills)),
      jsonb_build_object('name', 'plan_codes', 'label', 'Licence keys', 'rows', (select count(*) from plan_codes), 'newest', (select max(created_at) from plan_codes)),
      jsonb_build_object('name', 'help_requests', 'label', 'Help requests', 'rows', (select count(*) from help_requests), 'newest', (select max(created_at) from help_requests)),
      jsonb_build_object('name', 'events', 'label', 'Website visits and clicks', 'rows', (select count(*) from events), 'newest', (select max(created_at) from events)),
      jsonb_build_object('name', 'releases', 'label', 'Releases', 'rows', (select count(*) from releases), 'newest', (select max(created_at) from releases)),
      jsonb_build_object('name', 'admins', 'label', 'Admins', 'rows', (select count(*) from admins), 'newest', (select max(created_at) from admins))),
    'buckets', coalesce((select jsonb_agg(jsonb_build_object('name', bucket_id, 'files', n, 'bytes', b)) from
                (select bucket_id, count(*) n, coalesce(sum((metadata->>'size')::bigint), 0) b from storage.objects group by bucket_id) x), '[]'),
    'shops', coalesce((select jsonb_agg(jsonb_build_object('branch', branch_code, 'version', version, 'seen_at', seen_at) order by seen_at desc) from
                (select distinct on (branch_code) branch_code, version, seen_at from release_installs order by branch_code, seen_at desc) s), '[]'),
    'open_help', (select count(*) from help_requests where status <> 'solved'),
    'latest_release', (select version from releases where published order by string_to_array(version, '.')::int[] desc limit 1));
end $$;
revoke all on function public.admin_health() from public, anon;
grant execute on function public.admin_health() to authenticated;

-- ============================================================
-- 18) Flood protection for the public entry points (security review, 20 Nov 2026).
--     The demo form, help requests and shops' version reports can be called by anyone, without a login. Each new row
--     from a visitor (role anon, including a repeat demo request that updates the lead) passes a counter per sender address and a counter for everyone, per hour:
--     leads 5 per address / 200 in all, help requests 10 / 300, version reports 60 / 2000. Over the limit the request is
--     refused ("too many, try again later"); nothing is stored. Signed-in admins are never limited.
--     The address comes from the request headers Supabase passes in (x-forwarded-for); nothing about it is stored
--     except a one-way hash in rate_limits, which only keeps the current hour.
-- ============================================================
create table if not exists public.rate_limits (
  bucket       text not null,
  sender       text not null,          -- sha256 of the address, or 'all'
  window_start timestamptz not null,
  hits         int not null,
  primary key (bucket, sender)
);
alter table public.rate_limits enable row level security;   -- no policies: nobody reads it through the API
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.rate_ok(p_bucket text, p_per_sender int, p_all int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text := trim(split_part(coalesce(v_headers->>'cf-connecting-ip', v_headers->>'x-forwarded-for', v_headers->>'x-real-ip', 'unknown'), ',', 1));
  v_sender text := encode(extensions.digest(v_ip, 'sha256'), 'hex');
  v_hits int; v_all int;
begin
  delete from public.rate_limits where window_start < now() - interval '1 hour';
  insert into public.rate_limits as r (bucket, sender, window_start, hits) values (p_bucket, v_sender, now(), 1)
  on conflict (bucket, sender) do update set hits = r.hits + 1 returning hits into v_hits;
  insert into public.rate_limits as r (bucket, sender, window_start, hits) values (p_bucket, 'all', now(), 1)
  on conflict (bucket, sender) do update set hits = r.hits + 1 returning hits into v_all;
  return v_hits <= p_per_sender and v_all <= p_all;
end $$;
revoke all on function public.rate_ok(text, int, int) from public, anon, authenticated;

create or replace function public.limit_visitors() returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'role', '');
begin
  if v_role <> 'anon' then return new; end if;    -- admins, the service and SQL Editor are not limited
  if not public.rate_ok(tg_argv[0], tg_argv[1]::int, tg_argv[2]::int) then
    raise exception 'Too many requests from this connection. Please try again in an hour.' using errcode = 'P0429';
  end if;
  return new;
end $$;
revoke all on function public.limit_visitors() from public, anon, authenticated;

drop trigger if exists leads_limit on public.leads;
create trigger leads_limit before insert or update on public.leads for each row execute function public.limit_visitors('lead', '5', '200');
drop trigger if exists help_requests_limit on public.help_requests;
create trigger help_requests_limit before insert on public.help_requests for each row execute function public.limit_visitors('help', '10', '300');
drop trigger if exists release_installs_limit on public.release_installs;
create trigger release_installs_limit before insert on public.release_installs for each row execute function public.limit_visitors('install', '60', '2000');


-- ============================================================
-- 19) Invoices (admin → Bills): line items, your business details, and a private link per invoice.
--     A bill now carries its items [{desc, qty, price}], a discount and a tax %; the total (amount, whole rupees) is
--     worked out here from them, so the screen and the database always agree. Each bill has a share token (24 random
--     bytes): the client opens <site>/invoice/?t=<token> without logging in, sees the invoice, downloads it as PDF and can
--     upload a payment screenshot. The link can be switched off (share_on). Cancelled bills are never shown.
--     Your details on every invoice (name, phone, address, how to pay) live in invoice_settings (admins only; shown to a
--     client only inside their own invoice).
-- ============================================================
alter table public.bills add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.bills add column if not exists discount integer not null default 0 check (discount >= 0);
alter table public.bills add column if not exists tax_pct numeric(5,2) not null default 0 check (tax_pct between 0 and 100);
alter table public.bills add column if not exists share_token text unique default encode(extensions.gen_random_bytes(24), 'hex');
alter table public.bills add column if not exists share_on boolean not null default true;
alter table public.bills add column if not exists sent_at timestamptz;
update public.bills set share_token = encode(extensions.gen_random_bytes(24), 'hex') where share_token is null;

-- the total from the lines: sum(qty x price) - discount, + tax %, rounded to whole rupees. Old one-line bills (no items)
-- keep their amount.
create or replace function public.bill_total() returns trigger language plpgsql set search_path = public as $$
declare v_sub numeric := 0; l jsonb;
begin
  if jsonb_typeof(new.items) <> 'array' then raise exception 'Items must be a list'; end if;
  if jsonb_array_length(new.items) > 0 then
    if jsonb_array_length(new.items) > 50 then raise exception 'At most 50 lines on one invoice'; end if;
    for l in select * from jsonb_array_elements(new.items) loop
      if coalesce(length(trim(l->>'desc')), 0) not between 1 and 200 or (l->>'qty')::numeric <= 0 or (l->>'price')::numeric < 0 then
        raise exception 'Each line needs a description, a quantity above 0 and a price of 0 or more';
      end if;
      v_sub := v_sub + (l->>'qty')::numeric * (l->>'price')::numeric;
    end loop;
    new.amount := round((v_sub - new.discount) * (1 + new.tax_pct / 100));
    if new.amount <= 0 then raise exception 'The invoice total must be above Rs 0 (check the discount)'; end if;
  end if;
  return new;
end $$;
drop trigger if exists bills_total on public.bills;
create trigger bills_total before insert or update of items, discount, tax_pct, amount on public.bills for each row execute function public.bill_total();

create table if not exists public.invoice_settings (
  id          boolean primary key default true check (id),
  business    text not null default 'ZAP POS',
  owner_name  text,
  phone       text,
  email       text,
  address     text,
  pay_details text,          -- bank / JazzCash / Easypaisa lines, shown under "How to pay"
  note        text,          -- a line at the bottom (terms, thanks)
  updated_at  timestamptz not null default now()
);
insert into public.invoice_settings default values on conflict do nothing;
alter table public.invoice_settings enable row level security;
revoke all on public.invoice_settings from anon;
drop policy if exists "Admins manage invoice settings" on public.invoice_settings;
create policy "Admins manage invoice settings" on public.invoice_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- the client's view of one invoice, by its private link (no login). Flood-limited per address.
create or replace function public.invoice_view(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if coalesce(length(p_token), 0) <> 48 then return null; end if;
  if not public.rate_ok('invoice_view', 300, 20000) then raise exception 'Too many requests. Please try again later.' using errcode = 'P0429'; end if;
  select jsonb_build_object(
    'no', b.no, 'kind', b.kind, 'title', b.title, 'items', b.items, 'discount', b.discount, 'tax_pct', b.tax_pct, 'amount', b.amount,
    'issued_on', b.issued_on, 'due_on', b.due_on, 'status', b.status, 'paid_on', b.paid_on, 'note', b.note, 'has_proof', b.proof_path is not null,
    'client', jsonb_build_object('name', l.name, 'shop', l.shop, 'phone', l.phone, 'city', l.city),
    'from', (select to_jsonb(s) - 'id' - 'updated_at' from public.invoice_settings s))
  into v
  from public.bills b join public.leads l on l.id = b.lead_id
  where b.share_token = p_token and b.share_on and b.status <> 'cancelled';
  return v;
end $$;
revoke all on function public.invoice_view(text) from public;
grant execute on function public.invoice_view(text) to anon, authenticated;

-- the client sent a payment screenshot through the link: the file goes to bill-proofs/shared/<token>/..., then this marks
-- the invoice "proof received" for you to check. Only an unpaid, shared invoice; only a file in that invoice's own folder.
create or replace function public.invoice_proof(p_token text, p_path text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if coalesce(length(p_token), 0) <> 48 or p_path is null or p_path not like 'shared/' || p_token || '/%' then return false; end if;
  if not public.rate_ok('invoice_proof', 10, 500) then raise exception 'Too many uploads. Please try again later.' using errcode = 'P0429'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'bill-proofs' and o.name = p_path) then return false; end if;
  update public.bills set proof_path = p_path, status = case when status = 'unpaid' then 'proof' else status end
  where share_token = p_token and share_on and kind = 'bill' and status in ('unpaid', 'proof');
  return found;
end $$;
revoke all on function public.invoice_proof(text, text) from public;
grant execute on function public.invoice_proof(text, text) to anon, authenticated;

-- visitors may put a file only into the folder of a shared, unpaid invoice (images or PDF, 8 MB, set on the bucket)
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'] where id = 'bill-proofs';
drop policy if exists "Clients upload proof by link" on storage.objects;
create policy "Clients upload proof by link" on storage.objects for insert to anon
  with check (bucket_id = 'bill-proofs' and (storage.foldername(name))[1] = 'shared'
              and exists (select 1 from public.bills b where b.share_token = (storage.foldername(name))[2] and b.share_on and b.kind = 'bill'
                          and b.status in ('unpaid', 'proof')));

-- the customer's account page lists their invoices (with the private link to open each one)
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
      from public.payments p where p.lead_id = l.id), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object('no', b.no, 'kind', b.kind, 'title', b.title, 'amount', b.amount, 'issued_on', b.issued_on,
               'due_on', b.due_on, 'status', b.status, 'paid_on', b.paid_on, 'token', case when b.share_on then b.share_token end)
             order by b.issued_on desc, b.no desc)
      from public.bills b where b.lead_id = l.id and b.status <> 'cancelled'), '[]'::jsonb)
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
-- 20) ZAP POS setup: licence key first, then the owner's account (20 Nov 2026).
--     The POS setup screen sends the key a shop pasted to licence_lookup() and shows whose key it is (shop, owner,
--     plan) so the owner checks it before installing. Then it signs the owner up with email + password (the same
--     account as the website's /account page), passing the key as `plan_code` in the sign-up details: link_signup()
--     links the new login to exactly that key's shop, even when the owner types a different email or phone.
--     Only someone holding the key (ZAP sends it to the owner) can look it up; flood-limited like the other public
--     entry points.
-- ============================================================
create or replace function public.licence_lookup(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.rate_ok('licence_lookup', 30, 3000) then
    raise exception 'Too many requests. Please try again later.' using errcode = 'P0429';
  end if;
  select jsonb_build_object('branch_code', p.branch_code, 'counters', p.counters, 'paid_until', p.paid_until, 'status', p.status,
                            'shop', l.shop, 'name', l.name, 'phone', l.phone, 'city', l.city, 'email', l.email,
                            'has_account', l.user_id is not null)
    into v
    from public.plan_codes p join public.leads l on l.id = p.lead_id
   where replace(upper(p.code), '-', '') = replace(upper(trim(coalesce(p_code, ''))), '-', '')
   limit 1;
  return v;
end $$;
revoke all on function public.licence_lookup(text) from public;
grant execute on function public.licence_lookup(text) to anon, authenticated;

create or replace function public.link_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone text := nullif(trim(m->>'phone'), '');
  v_plan text := nullif(replace(upper(trim(m->>'plan_code')), '-', ''), '');
  v_id uuid;
  v_user uuid;
begin
  -- signed up from the ZAP POS setup screen with a licence key: that key's shop, whatever email or phone was typed
  if v_plan is not null then
    select l.id, l.user_id into v_id, v_user
      from public.plan_codes p join public.leads l on l.id = p.lead_id
     where replace(upper(p.code), '-', '') = v_plan
     limit 1 for update of l;
  end if;
  if v_id is null then
    select id, user_id into v_id, v_user from public.leads
     where lower(email) = lower(new.email) or (v_phone is not null and phone_key = public.phone_key(v_phone))
     order by (lower(email) = lower(new.email)) desc nulls last
     limit 1 for update;
  end if;
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

-- ============================================================
-- 21) ZAP POS setup progress (22 Nov 2026): who reached the licence-key step, who asked for a key.
--     The setup screen registers the owner first (their sign-up already makes or finds the lead), then asks for the key.
--     When it shows the key page it calls setup_progress('at_key'); when the owner presses "WhatsApp me for a key" it
--     calls it with 'asked_key'. The lead's `setup_stage` only ever moves forward (registered, at_key, asked_key,
--     key_sent); making a key for the lead in Admin > Plans sets 'key_sent' by itself. It never changes the lead's
--     status (that stays yours: New, Contacted, Demo, Won, Lost), except a Lost lead that comes back becomes New.
--     Same rules as the demo form: one lead per email / mobile number, flood-limited, visitors read nothing.
-- ============================================================
alter table public.leads add column if not exists setup_stage text
  check (setup_stage in ('registered', 'at_key', 'asked_key', 'key_sent'));

create or replace function public.setup_progress(
  p_name text, p_phone text, p_email text default null, p_shop text default null, p_stage text default 'at_key')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text := nullif(lower(trim(p_email)), '');
  v_stages text[] := array['registered', 'at_key', 'asked_key', 'key_sent'];
  v_id uuid; v_old text; v_note text;
begin
  if p_stage is null or not (p_stage = any (v_stages)) or p_stage = 'key_sent' then return; end if;   -- key_sent is set only by the admin's key
  if char_length(coalesce(p_name, '')) < 2 or char_length(coalesce(p_phone, '')) < 7 then return; end if;
  select id, setup_stage into v_id, v_old from public.leads
   where (v_email is not null and lower(email) = v_email) or phone_key = public.phone_key(p_phone)
   order by (v_email is not null and lower(email) = v_email) desc
   limit 1 for update;
  v_note := case p_stage when 'asked_key' then 'Asked for a licence key from the ZAP POS setup on '
                         when 'at_key' then 'Reached the licence-key step of the ZAP POS setup on '
                         else 'Registered in the ZAP POS setup on ' end
            || to_char(now() at time zone 'Asia/Karachi', 'DD Mon YYYY, HH12:MI AM');
  if v_id is null then
    insert into public.leads (name, phone, email, shop, source, setup_stage, notes)
    values (left(trim(p_name), 80), left(trim(p_phone), 20), v_email, left(nullif(trim(p_shop), ''), 100), 'ZAP POS setup', p_stage, v_note);
  elsif v_old is null or array_position(v_stages, p_stage) > array_position(v_stages, v_old) then
    update public.leads l set
      setup_stage = p_stage,
      email  = coalesce(l.email, v_email),
      shop   = coalesce(l.shop, left(nullif(trim(p_shop), ''), 100)),
      status = case when l.status = 'lost' then 'new' else l.status end,
      notes  = left(concat_ws(E'\n', l.notes, v_note), 4000)
    where l.id = v_id;
  end if;
exception when unique_violation then
  null;   -- the same shop was saved a moment ago by a parallel request
end $$;
revoke all on function public.setup_progress(text, text, text, text, text) from public, authenticated;
grant execute on function public.setup_progress(text, text, text, text, text) to anon;

-- A key made for a lead in Admin > Plans: they are no longer waiting for one.
create or replace function public.plan_codes_mark_sent() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.leads set setup_stage = 'key_sent' where id = new.lead_id and setup_stage is distinct from 'key_sent';
  return new;
end $$;
revoke all on function public.plan_codes_mark_sent() from public, anon, authenticated;
drop trigger if exists plan_codes_mark_sent on public.plan_codes;
create trigger plan_codes_mark_sent after insert on public.plan_codes for each row execute function public.plan_codes_mark_sent();

-- ============================================================
-- 22) ZAP POS setup, "Log in" for an owner who already registered (22 Nov 2026).
--     After the owner logs in with email + password (Supabase Auth), the setup screen asks for their key with this
--     function, so a returning owner doesn't paste it again: the newest key made for the lead linked to the logged-in
--     account, with its status (active / replaced / revoked). Only the owner's own key, only when signed in.
-- ============================================================
create or replace function public.my_licence()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', c.code, 'status', c.status, 'paid_until', c.paid_until)
  from public.leads l
  join lateral (select pc.code, pc.status, pc.paid_until from public.plan_codes pc
                where pc.lead_id = l.id order by pc.created_at desc limit 1) c on true
  where l.user_id = auth.uid()
$$;
revoke all on function public.my_licence() from public, anon;
grant execute on function public.my_licence() to authenticated;

-- ============================================================
-- 23) Tenancy (23 Nov 2026, owner decision): a phone number is not proof that someone owns a shop.
--     A sign-up links to a shop at once only by its licence key (ZAP POS setup) or the lead's own email. A sign-up that
--     matches a shop ONLY by mobile number is held as "waiting for approval" (leads.pending_user_id) and sees nothing of
--     the shop until the ZAP team approves it in Admin > Leads, or the person enters that shop's active licence key
--     (claim_shop), since only the real owner has the key. Only one sign-up can wait per shop; a later one stays unlinked.
-- ============================================================
alter table public.leads add column if not exists pending_user_id uuid unique references auth.users(id) on delete set null;
alter table public.leads add column if not exists pending_email text;
alter table public.leads add column if not exists pending_at timestamptz;

create or replace function public.link_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone text := nullif(trim(m->>'phone'), '');
  v_plan text := nullif(replace(upper(trim(m->>'plan_code')), '-', ''), '');
  v_id uuid; v_user uuid; v_pending uuid;
begin
  -- 1) signed up from the ZAP POS setup screen with a licence key: that key's shop
  if v_plan is not null then
    select l.id, l.user_id into v_id, v_user
      from public.plan_codes p join public.leads l on l.id = p.lead_id
     where replace(upper(p.code), '-', '') = v_plan
     limit 1 for update of l;
  end if;
  -- 2) the lead's own email
  if v_id is null then
    select id, user_id into v_id, v_user from public.leads where lower(email) = lower(new.email) limit 1 for update;
  end if;
  if v_id is not null then
    if v_user is not null and v_user <> new.id then
      raise exception 'ZAP_ACCOUNT_EXISTS: this shop already has an account';
    end if;
    update public.leads l set
      user_id = new.id, signed_up_at = now(), pending_user_id = null, pending_email = null, pending_at = null,
      email = coalesce(l.email, lower(new.email)),
      shop  = coalesce(l.shop, nullif(trim(m->>'shop'), '')),
      city  = coalesce(l.city, nullif(trim(m->>'city'), '')),
      status = case when l.status = 'lost' then 'new' else l.status end
    where l.id = v_id;
    return new;
  end if;
  if v_phone is null then return new; end if;   -- e.g. the owner's own login made in the dashboard
  -- 3) only the mobile number matches: wait for approval (or the licence key)
  select id, user_id, pending_user_id into v_id, v_user, v_pending from public.leads
   where phone_key = public.phone_key(v_phone) limit 1 for update;
  if v_id is null then
    insert into public.leads (name, phone, email, shop, city, source, user_id, signed_up_at)
    values (coalesce(nullif(trim(m->>'name'), ''), split_part(new.email, '@', 1)), v_phone, lower(new.email),
            nullif(trim(m->>'shop'), ''), nullif(trim(m->>'city'), ''), 'Sign-up', new.id, now());
  elsif v_user is not null then
    raise exception 'ZAP_ACCOUNT_EXISTS: this shop already has an account';
  elsif v_pending is null then
    update public.leads set pending_user_id = new.id, pending_email = lower(new.email), pending_at = now(),
           status = case when status = 'lost' then 'new' else status end
    where id = v_id;
  end if;
  return new;
end $$;
revoke all on function public.link_signup() from public, anon, authenticated;

-- The signed-in person proves the shop is theirs with its active licence key: link now.
create or replace function public.claim_shop(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_lead uuid; v_user uuid;
begin
  if v_uid is null then return false; end if;
  if exists (select 1 from public.leads where user_id = v_uid) then return true; end if;
  if not public.rate_ok('claim_shop', 20, 2000) then
    raise exception 'Too many requests. Please try again later.' using errcode = 'P0429';
  end if;
  select l.id, l.user_id into v_lead, v_user
    from public.plan_codes p join public.leads l on l.id = p.lead_id
   where p.status = 'active' and replace(upper(p.code), '-', '') = replace(upper(trim(coalesce(p_code, ''))), '-', '')
   limit 1 for update of l;
  if v_lead is null or (v_user is not null and v_user <> v_uid) then return false; end if;
  update public.leads set pending_user_id = null, pending_email = null, pending_at = null where pending_user_id = v_uid and id <> v_lead;
  update public.leads set user_id = v_uid, signed_up_at = now(), pending_user_id = null, pending_email = null, pending_at = null
  where id = v_lead;
  return true;
end $$;
revoke all on function public.claim_shop(text) from public, anon;
grant execute on function public.claim_shop(text) to authenticated;

-- Admin > Leads: approve or reject a sign-up that is waiting.
create or replace function public.approve_signup(p_lead uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only the ZAP team can do this' using errcode = '42501'; end if;
  if p_approve then
    update public.leads set user_id = pending_user_id, signed_up_at = now(),
           pending_user_id = null, pending_email = null, pending_at = null
    where id = p_lead and pending_user_id is not null and user_id is null;
  else
    update public.leads set pending_user_id = null, pending_email = null, pending_at = null where id = p_lead;
  end if;
end $$;
revoke all on function public.approve_signup(uuid, boolean) from public, anon;
grant execute on function public.approve_signup(uuid, boolean) to authenticated;

-- The account page: a waiting sign-up only learns that it is waiting (nothing about the shop).
create or replace function public.my_signup_state()
returns text language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.leads where user_id = auth.uid()) then 'linked'
              when exists (select 1 from public.leads where pending_user_id = auth.uid()) then 'pending'
              else 'none' end
$$;
revoke all on function public.my_signup_state() from public, anon;
grant execute on function public.my_signup_state() to authenticated;

-- ============================================================
-- 24) Owner app reads (25 Nov 2026): what the phone app (/account/, PhoneConsole.jsx) shows beyond my_branches():
--     every bill, the cash drawers (shifts) and support requests from the owner's own branches.
--     They only read zap_cloud.records / support_requests, which each branch's main PC sends (desktop repo cloud/*.sql).
--     Same tenancy as my_branches(): signed in, and the branch's org belongs to the lead linked to this login.
--     Signed-in users only (no anon), read-only.
-- ============================================================

-- Bills issued between two days (Pakistan time), newest first, for all branches or one. Totals cover the whole range.
create or replace function public.my_sales(p_from date default null, p_to date default null, p_branch uuid default null, p_limit int default 300)
returns jsonb language sql stable security definer set search_path = zap_cloud, public, pg_temp as $$
    with mine as (select b.id, b.name, b.code from zap_cloud.branches b join zap_cloud.orgs o on o.id = b.org_id
                  join public.leads l on l.id = o.lead_id
                  where auth.uid() is not null and l.user_id = auth.uid() and (p_branch is null or b.id = p_branch)),
    inv as (select r.branch_id, r.payload p from zap_cloud.records r join mine m on m.id = r.branch_id
            where r.kind = 'invoice'
              and (((r.payload->>'issued_at')::timestamptz) at time zone 'Asia/Karachi')::date
                  between coalesce(p_from, date '2000-01-01') and coalesce(p_to, date '2999-12-31')),
    paid as (select r.branch_id, r.payload->>'invoice_id' inv, jsonb_agg(distinct r.payload->>'method') methods
             from zap_cloud.records r join mine m on m.id = r.branch_id
             where r.kind = 'payment' and (r.payload->>'amount')::numeric > 0
               and (((r.payload->>'created_at')::timestamptz) at time zone 'Asia/Karachi')::date
                   between coalesce(p_from, date '2000-01-01') - 1 and coalesce(p_to, date '2999-12-31') + 1
             group by 1, 2),
    page as (select i.*, m.name branch_name from inv i join mine m on m.id = i.branch_id
             order by i.p->>'issued_at' desc limit least(greatest(coalesce(p_limit, 300), 1), 500))
    select jsonb_build_object(
        'count', (select count(*) from inv),
        'total', coalesce((select sum((p->>'total')::numeric) from inv), 0),
        'bills', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', pg.p->>'id', 'no', pg.p->>'invoice_no', 'at', pg.p->>'issued_at',
                    'subtotal', (pg.p->>'subtotal')::numeric, 'discount', (pg.p->>'discount')::numeric,
                    'tax', (pg.p->>'tax')::numeric, 'total', (pg.p->>'total')::numeric,
                    'branch', pg.branch_name, 'counter', c.payload->>'code',
                    'service', o.payload->>'service_type', 'customer', o.payload->>'customer_name',
                    'methods', coalesce(pd.methods, '[]'::jsonb)) order by pg.p->>'issued_at' desc)
                  from page pg
                  left join zap_cloud.records o on o.branch_id = pg.branch_id and o.kind = 'order' and o.entity_id = pg.p->>'order_id'
                  left join zap_cloud.records c on c.branch_id = pg.branch_id and c.kind = 'counter' and c.entity_id = pg.p->>'counter_id'
                  left join paid pd on pd.branch_id = pg.branch_id and pd.inv = pg.p->>'id'), '[]'::jsonb))
$$;

-- Cash drawers: every shift still open, and those closed in the last p_days days, with the cash taken in each,
-- plus how many counters the branches have.
create or replace function public.my_shifts(p_days int default 1, p_branch uuid default null)
returns jsonb language sql stable security definer set search_path = zap_cloud, public, pg_temp as $$
    with mine as (select b.id, b.name from zap_cloud.branches b join zap_cloud.orgs o on o.id = b.org_id
                  join public.leads l on l.id = o.lead_id
                  where auth.uid() is not null and l.user_id = auth.uid() and (p_branch is null or b.id = p_branch)),
    sh as (select r.branch_id, r.payload p, m.name branch_name from zap_cloud.records r join mine m on m.id = r.branch_id
           where r.kind = 'shift'
             and (r.payload->>'status' = 'open'
                  or (r.payload->>'closed_at')::timestamptz >= now() - make_interval(days => least(greatest(coalesce(p_days, 1), 1), 31))))
    select jsonb_build_object(
        'counters', (select count(*) from zap_cloud.records r join mine m on m.id = r.branch_id
                     where r.kind = 'counter' and coalesce((r.payload->>'active')::boolean, true)),
        -- each counter, for the phone's "Open shift" form (open = it already has a shift)
        'counterList', coalesce((select jsonb_agg(jsonb_build_object('branchId', m.id, 'branch', m.name, 'code', r.payload->>'code', 'name', r.payload->>'name',
                                                                     'open', exists (select 1 from sh where sh.branch_id = r.branch_id and sh.p->>'status' = 'open'
                                                                                     and sh.p->>'counter_id' = r.entity_id))
                                                  order by m.name, r.payload->>'code')
                                 from zap_cloud.records r join mine m on m.id = r.branch_id
                                 where r.kind = 'counter' and coalesce((r.payload->>'active')::boolean, true)), '[]'::jsonb),
        'shifts', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', s.p->>'id', 'branchId', s.branch_id, 'branch', s.branch_name, 'counter', c.payload->>'code', 'counterName', c.payload->>'name',
                    'status', s.p->>'status', 'openedAt', s.p->>'opened_at', 'openingCash', (s.p->>'opening_cash')::numeric,
                    'cashTaken', coalesce((select sum((pm.payload->>'amount')::numeric) from zap_cloud.records pm
                                           where pm.branch_id = s.branch_id and pm.kind = 'payment'
                                             and pm.payload->>'shift_id' = s.p->>'id' and pm.payload->>'method' = 'cash'), 0),
                    'closedAt', s.p->>'closed_at', 'counted', (s.p->>'counted_cash')::numeric,
                    'expected', (s.p->>'expected_cash')::numeric, 'variance', (s.p->>'variance')::numeric)
                  order by (s.p->>'status' = 'open') desc, s.p->>'opened_at' desc)
                  from sh s left join zap_cloud.records c on c.branch_id = s.branch_id and c.kind = 'counter' and c.entity_id = s.p->>'counter_id'), '[]'::jsonb))
$$;

-- Help requests sent from the owner's branches (ZAP POS Support screen), newest first, with the last message.
create or replace function public.my_support(p_limit int default 30)
returns jsonb language sql stable security definer set search_path = zap_cloud, public, pg_temp as $$
    with mine as (select b.id, b.name from zap_cloud.branches b join zap_cloud.orgs o on o.id = b.org_id
                  join public.leads l on l.id = o.lead_id where auth.uid() is not null and l.user_id = auth.uid())
    select coalesce(jsonb_agg(x order by x->>'updatedAt' desc), '[]'::jsonb) from (
        select jsonb_build_object('id', s.id, 'no', s.no, 'subject', s.subject, 'status', s.status, 'branch', m.name,
                                  'updatedAt', s.updated_at,
                                  'last', (select jsonb_build_object('fromZap', g.from_zap, 'body', g.body, 'at', g.created_at)
                                           from zap_cloud.support_messages g where g.request_id = s.id order by g.created_at desc limit 1)) x
        from zap_cloud.support_requests s join mine m on m.id = s.branch_id
        order by s.updated_at desc limit least(greatest(coalesce(p_limit, 30), 1), 100)) t
$$;

revoke all on function public.my_sales(date, date, uuid, int), public.my_shifts(int, uuid), public.my_support(int) from public, anon;
grant execute on function public.my_sales(date, date, uuid, int), public.my_shifts(int, uuid), public.my_support(int) to authenticated;

-- ============================================================
-- 25) Licence activation at ZAP POS setup (26 Nov 2026, owner decision): the owner always logs in and types the key
--     ZAP sent; setup goes on only when this check, made online as that login, says yes. A leaked key alone is useless:
--     it must belong to the logged-in account's shop (or be the first claim of a shop with no account yet).
--     Answers {ok, reason, …}: reason unknown | revoked | replaced | ended | other_account | other_shop.
-- ============================================================
create or replace function public.activate_licence(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); k record; v_mine uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  if not public.rate_ok('activate_licence', 20, 2000) then
    raise exception 'Too many requests. Please try again later.' using errcode = 'P0429';
  end if;
  select p.branch_code, p.counters, p.paid_until, p.status, p.lead_id, l.user_id, l.shop, l.name
    into k
    from public.plan_codes p join public.leads l on l.id = p.lead_id
   where replace(upper(p.code), '-', '') = replace(upper(trim(coalesce(p_code, ''))), '-', '')
   limit 1;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown'); end if;
  if k.status = 'revoked' then return jsonb_build_object('ok', false, 'reason', 'revoked'); end if;
  if k.status = 'replaced' then return jsonb_build_object('ok', false, 'reason', 'replaced'); end if;
  if k.paid_until < (now() at time zone 'Asia/Karachi')::date then return jsonb_build_object('ok', false, 'reason', 'ended', 'paid_until', k.paid_until); end if;
  if k.user_id is not null and k.user_id <> v_uid then return jsonb_build_object('ok', false, 'reason', 'other_account'); end if;
  select id into v_mine from public.leads where user_id = v_uid limit 1;
  if v_mine is not null and v_mine <> k.lead_id then return jsonb_build_object('ok', false, 'reason', 'other_shop'); end if;
  if k.user_id is null then   -- first claim: this login becomes the shop's account (same as claim_shop)
    update public.leads set pending_user_id = null, pending_email = null, pending_at = null where pending_user_id = v_uid and id <> k.lead_id;
    update public.leads set user_id = v_uid, signed_up_at = coalesce(signed_up_at, now()), pending_user_id = null, pending_email = null, pending_at = null
     where id = k.lead_id;
  end if;
  return jsonb_build_object('ok', true, 'branch_code', k.branch_code, 'counters', k.counters, 'paid_until', k.paid_until,
                            'shop', k.shop, 'name', k.name);
end $$;
revoke all on function public.activate_licence(text) from public, anon;
grant execute on function public.activate_licence(text) to authenticated;
