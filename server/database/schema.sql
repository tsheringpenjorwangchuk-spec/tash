-- PostgreSQL schema for the Lost & Found application.
-- Run once against the target database before enabling DATABASE_URL.

create table if not exists lost_items (
  id text primary key,
  reporter_email text,
  title text,
  status text not null default 'Searching',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lost_items_reporter_email on lost_items (reporter_email);
create index if not exists idx_lost_items_status on lost_items (status);
create index if not exists idx_lost_items_payload_gin on lost_items using gin (payload);

create table if not exists found_items (
  id text primary key,
  title text,
  status text not null default 'Available',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_found_items_status on found_items (status);
create index if not exists idx_found_items_payload_gin on found_items using gin (payload);

create table if not exists claims (
  id text primary key,
  claimant_email text,
  status text not null default 'Pending Admin Review',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_claims_claimant_email on claims (claimant_email);
create index if not exists idx_claims_status on claims (status);
create index if not exists idx_claims_payload_gin on claims using gin (payload);
