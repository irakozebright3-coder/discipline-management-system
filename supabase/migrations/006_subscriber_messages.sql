-- Updates / messages the founder writes for subscribers, from the platform console.
create table if not exists public.subscriber_messages (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'email', 'phone')),
  status text not null default 'draft' check (status in ('draft', 'sent', 'partial', 'failed', 'recorded')),
  recipients_total integer not null default 0,
  delivered integer not null default 0,
  failed integer not null default 0,
  delivery_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists subscriber_messages_created_idx on public.subscriber_messages (created_at desc);
-- Server-only table (service role). No direct browser access.
alter table public.subscriber_messages enable row level security;
