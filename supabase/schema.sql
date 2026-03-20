-- DomPulse Supabase schema
-- Table: domains

-- Domains table
create table if not exists public.domains (
  id bigint generated always as identity primary key,
  domain text not null unique,
  name text not null,
  tld text not null,
  length integer not null,
  has_numbers boolean not null default false,
  is_number_only boolean not null default false,
  has_hyphen boolean not null default false,
  registrar text not null,
  created_at date not null
);

-- Helpful indexes for filtering/sorting
create index if not exists idx_domains_tld
  on public.domains (tld);

create index if not exists idx_domains_length
  on public.domains (length);

create index if not exists idx_domains_has_numbers
  on public.domains (has_numbers);

create index if not exists idx_domains_has_hyphen
  on public.domains (has_hyphen);

create index if not exists idx_domains_created_at
  on public.domains (created_at);

