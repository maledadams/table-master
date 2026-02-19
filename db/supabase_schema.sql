create extension if not exists pgcrypto;
create extension if not exists btree_gist;

do $$ begin
  create type reservation_status as enum ('pending','confirmed','cancelled','completed','no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type table_type as enum ('standard','square','circular');
exception when duplicate_object then null; end $$;

create table if not exists restaurant_areas (
  id text primary key,
  name text not null unique,
  max_tables int not null check (max_tables > 0),
  is_vip boolean not null default false
);

create table if not exists restaurant_tables (
  id text primary key,
  area_id text not null references restaurant_areas(id) on delete restrict,
  name text not null,
  capacity int not null check (capacity in (2,4,6,8,10)),
  type table_type not null default 'standard',
  is_vip boolean not null default false,
  can_merge boolean not null default false,
  merge_group text null,
  x numeric(6,3) not null check (x >= 0 and x <= 100),
  y numeric(6,3) not null check (y >= 0 and y <= 100),
  version int not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_restaurant_tables_area on restaurant_tables(area_id);

create table if not exists reservations (
  id text primary key default ('res-' || replace(gen_random_uuid()::text,'-','')),
  client_name text not null,
  party_size int not null check (party_size >= 1),
  status reservation_status not null default 'confirmed',
  start_at timestamptz not null,
  end_at timestamptz not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_at < end_at)
);

create index if not exists idx_reservations_time on reservations(start_at, end_at);
create index if not exists idx_reservations_status on reservations(status);

create table if not exists reservation_tables (
  reservation_id text not null references reservations(id) on delete cascade,
  table_id text not null references restaurant_tables(id) on delete restrict,
  primary key (reservation_id, table_id)
);

create index if not exists idx_reservation_tables_table on reservation_tables(table_id);

create table if not exists idempotency_keys (
  key text primary key,
  request_hash text not null,
  reservation_id text not null references reservations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_idempotency_created_at on idempotency_keys(created_at);

create or replace function trg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

create or replace function trg_bump_table_version()
returns trigger language plpgsql as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists tr_reservations_touch on reservations;
create trigger tr_reservations_touch
before update on reservations
for each row execute function trg_touch_updated_at();

drop trigger if exists tr_tables_bump on restaurant_tables;
create trigger tr_tables_bump
before update on restaurant_tables
for each row execute function trg_bump_table_version();
