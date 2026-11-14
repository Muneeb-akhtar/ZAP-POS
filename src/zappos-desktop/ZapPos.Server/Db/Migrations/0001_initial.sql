-- ZAP POS main-PC database, version 1.
-- Rules (see docs/DESKTOP.md):
--   * every record has a UUID; client-made IDs (orders, lines, payments) make retries harmless (no duplicates)
--   * money = bigint paisa; quantities = numeric(14,3) (kg, litres, pieces)
--   * stock = sum of stock_movement rows, never an overwritten total
--   * orders, lines, payments, stock movements and the audit log are never deleted (trigger below)
--   * order numbers come from order_counter (one sequence per branch per business day), invoice numbers from
--     invoice_counter (one unbroken series per branch), both inside the same transaction as the record they number

create table branch (
  id                  uuid primary key,
  org_id              uuid not null,
  code                text not null unique check (code ~ '^[A-Z0-9]{2,6}$'),
  name                text not null check (char_length(name) between 1 and 80),
  day_start_hour      smallint not null default 4 check (day_start_hour between 0 and 12),
  tax_bps             int not null default 0 check (tax_bps between 0 and 5000),
  prices_include_tax  boolean not null default true,
  round_to_rupee      boolean not null default true,
  discount_limit_bps  int not null default 1000 check (discount_limit_bps between 0 and 10000),
  created_at          timestamptz not null default now()
);

create table counter (
  id          uuid primary key,
  branch_id   uuid not null references branch (id),
  number      smallint not null check (number between 1 and 99),
  name        text not null check (char_length(name) between 1 and 40),
  created_at  timestamptz not null default now(),
  unique (branch_id, number)
);

create table staff (
  id             uuid primary key,
  branch_id      uuid not null references branch (id),
  name           text not null check (char_length(name) between 1 and 60),
  role           text not null check (role in ('owner', 'manager', 'cashier', 'waiter')),
  pin_hash       text not null,
  password_hash  text,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (branch_id, name)
);

create table session (
  token_hash  text primary key,
  staff_id    uuid not null references staff (id),
  counter_id  uuid references counter (id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz
);

-- Kitchen stations (grill, kitchen, drinks): each menu item prints on its station's ticket.
create table station (
  id          uuid primary key,
  branch_id   uuid not null references branch (id),
  name        text not null check (char_length(name) between 1 and 40),
  active      boolean not null default true,
  unique (branch_id, name)
);

-- One table for everything sold or used: retail products, menu items and ingredients.
create table item (
  id             uuid primary key,
  branch_id      uuid not null references branch (id),
  name           text not null check (char_length(name) between 1 and 120),
  barcode        text check (char_length(barcode) between 1 and 64),
  unit           text not null default 'pcs' check (unit in ('pcs', 'kg', 'g', 'l', 'ml', 'pack')),
  price_paisa    bigint not null default 0 check (price_paisa >= 0),
  cost_paisa     bigint check (cost_paisa >= 0),
  sellable       boolean not null default true,   -- shown on the counter / menu
  stock_tracked  boolean not null default false,  -- has stock of its own (products, ingredients)
  station_id     uuid references station (id),    -- restaurant: which kitchen ticket it prints on
  available      boolean not null default true,   -- false = sold out right now (greyed on every counter)
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index item_barcode on item (branch_id, barcode) where barcode is not null;
create index item_name on item (branch_id, lower(name));

create table modifier (
  id           uuid primary key,
  item_id      uuid not null references item (id),
  name         text not null check (char_length(name) between 1 and 60),
  price_paisa  bigint not null default 0 check (price_paisa >= 0),
  active       boolean not null default true,
  unique (item_id, name)
);

-- Recipe: one unit of item uses qty_per_unit of each ingredient.
create table recipe_part (
  item_id        uuid not null references item (id),
  ingredient_id  uuid not null references item (id),
  qty_per_unit   numeric(14, 3) not null check (qty_per_unit > 0),
  primary key (item_id, ingredient_id),
  check (item_id <> ingredient_id)
);

create table dining_table (
  id         uuid primary key,
  branch_id  uuid not null references branch (id),
  name       text not null check (char_length(name) between 1 and 20),
  area       text check (char_length(area) <= 40),
  active     boolean not null default true,
  unique (branch_id, name)
);

create table stock_movement (
  id               uuid primary key,
  branch_id        uuid not null references branch (id),
  item_id          uuid not null references item (id),
  kind             text not null check (kind in ('receive', 'sale', 'kitchenuse', 'waste', 'adjust', 'transferout', 'transferin', 'return')),
  quantity         numeric(14, 3) not null check (quantity <> 0),  -- signed: + in, − out
  unit_cost_paisa  bigint check (unit_cost_paisa >= 0),
  order_id         uuid,
  reason           text check (char_length(reason) <= 200),
  staff_id         uuid references staff (id),
  created_at       timestamptz not null default now()
);
create index stock_movement_item on stock_movement (item_id);

create view stock_on_hand as
  select i.id as item_id, i.branch_id, coalesce(sum(m.quantity), 0)::numeric(14, 3) as quantity
  from item i left join stock_movement m on m.item_id = i.id
  where i.stock_tracked
  group by i.id, i.branch_id;

create table order_counter (
  branch_id     uuid not null references branch (id),
  business_day  date not null,
  last_no       int not null check (last_no > 0),
  primary key (branch_id, business_day)
);

create table invoice_counter (
  branch_id  uuid primary key references branch (id),
  last_no    bigint not null check (last_no >= 0)
);

create table sales_order (
  id                uuid primary key,             -- made by the counter: re-sending the same order is ignored
  branch_id         uuid not null references branch (id),
  counter_id        uuid not null references counter (id),
  business_day      date not null,
  order_no          int not null check (order_no > 0),
  number_text       text not null,                -- "#104" (or "C2-07" from an offline counter, Phase 3)
  kind              text not null check (kind in ('retail', 'dinein', 'takeaway', 'delivery')),
  status            text not null default 'open' check (status in ('open', 'sent', 'paid', 'voided')),
  table_id          uuid references dining_table (id),
  customer_name     text check (char_length(customer_name) <= 80),
  customer_phone    text check (char_length(customer_phone) <= 20),
  customer_address  text check (char_length(customer_address) <= 300),
  discount_paisa    bigint not null default 0 check (discount_paisa >= 0),
  opened_by         uuid not null references staff (id),
  created_at        timestamptz not null default now(),
  paid_at           timestamptz,
  voided_at         timestamptz,
  void_reason       text check (char_length(void_reason) <= 200),
  voided_by         uuid references staff (id),
  invoice_no        text unique,
  subtotal_paisa    bigint,
  tax_paisa         bigint,
  rounding_paisa    bigint,
  total_paisa       bigint,
  unique (branch_id, business_day, order_no),
  check ((kind = 'dinein') = (table_id is not null)),
  check ((status = 'paid') = (invoice_no is not null))
);
-- One open order per table at a time: two counters can't open Table 7 twice.
create unique index sales_order_open_table on sales_order (table_id) where status in ('open', 'sent');

create table order_line (
  id                    uuid primary key,          -- made by the counter: re-sending the same line is ignored
  order_id              uuid not null references sales_order (id),
  item_id               uuid not null references item (id),
  item_name             text not null,             -- copied at sale time: later price/name changes never alter old bills
  unit_price_paisa      bigint not null check (unit_price_paisa >= 0),
  quantity              numeric(14, 3) not null check (quantity > 0),
  modifiers             jsonb not null default '[]',
  modifiers_paisa       bigint not null default 0 check (modifiers_paisa >= 0),
  discount_paisa        bigint not null default 0 check (discount_paisa >= 0),
  note                  text check (char_length(note) <= 200),
  station_id            uuid references station (id),
  added_by              uuid not null references staff (id),
  added_at              timestamptz not null default now(),
  sent_at               timestamptz,               -- went to the kitchen (or sold, for retail)
  cancelled_at          timestamptz,
  cancelled_by          uuid references staff (id),
  cancel_reason         text check (char_length(cancel_reason) <= 200),
  check ((cancelled_at is null) = (cancelled_by is null))
);
create index order_line_order on order_line (order_id);

create table payment (
  id              uuid primary key,                -- made by the counter: a retried payment is not taken twice
  order_id        uuid not null references sales_order (id),
  method          text not null check (method in ('cash', 'card', 'jazzcash', 'easypaisa', 'bank', 'other')),
  amount_paisa    bigint not null check (amount_paisa > 0),
  tendered_paisa  bigint check (tendered_paisa >= amount_paisa),
  reference       text check (char_length(reference) <= 80),
  staff_id        uuid not null references staff (id),
  created_at      timestamptz not null default now()
);
create index payment_order on payment (order_id);

create table audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  branch_id   uuid not null references branch (id),
  staff_id    uuid references staff (id),
  counter_id  uuid references counter (id),
  action      text not null,
  entity_id   uuid,
  detail      jsonb not null default '{}'
);
create index audit_log_at on audit_log (at desc);

-- Records that money and stock depend on are permanent: corrections are new records (void, cancel, movement).
create function forbid_delete() returns trigger language plpgsql as $$
begin
  raise exception 'ZAP: % rows are permanent and cannot be deleted', tg_table_name;
end $$;
create trigger sales_order_keep before delete on sales_order for each row execute function forbid_delete();
create trigger order_line_keep before delete on order_line for each row execute function forbid_delete();
create trigger payment_keep before delete on payment for each row execute function forbid_delete();
create trigger stock_movement_keep before delete on stock_movement for each row execute function forbid_delete();
create trigger audit_log_keep before delete on audit_log for each row execute function forbid_delete();
create trigger audit_log_frozen before update on audit_log for each row execute function forbid_delete();
