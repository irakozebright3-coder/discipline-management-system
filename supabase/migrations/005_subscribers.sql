-- Public "subscribe for updates" list. One row per email or phone number.
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  contact text not null,
  contact_type text not null check (contact_type in ('email', 'phone')),
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  source text default 'landing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Same person cannot subscribe twice (emails compared case-insensitively, stored lowercase).
create unique index if not exists subscribers_contact_key on public.subscribers (contact);
create index if not exists subscribers_created_idx on public.subscribers (created_at desc);

-- Only the server (service role) touches this table. No direct browser access.
alter table public.subscribers enable row level security;
