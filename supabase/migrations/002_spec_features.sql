-- 002: Spec feature expansion — person detail fields, org structure, public content,
-- subscriptions, and platform-owner console tables. Idempotent; safe on live data.

-- ===== Person additions (spec fields) =====
alter table public.persons add column if not exists photo_url text not null default '';
alter table public.persons add column if not exists trade_id text;
alter table public.persons add column if not exists class_id text;
alter table public.persons add column if not exists guardian_name text not null default '';
alter table public.persons add column if not exists guardian_phone text not null default '';
alter table public.persons add column if not exists department_id text;
alter table public.persons add column if not exists office_id text;
alter table public.persons add column if not exists term1_marks numeric(6,2) not null default 40;
alter table public.persons add column if not exists term2_marks numeric(6,2) not null default 40;
alter table public.persons add column if not exists term3_marks numeric(6,2) not null default 40;

-- ===== Violation category =====
alter table public.violations add column if not exists category text not null default 'General';

-- ===== Org structure nodes =====
create type public.structure_node_type as enum (
  'trade','class','department','office','faculty','academic_department','program','cohort','year_of_study','role'
);
create table if not exists public.structure_nodes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  node_type public.structure_node_type not null,
  name text not null,
  parent_id uuid references public.structure_nodes(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, node_type, name)
);

-- ===== Public content =====
create table if not exists public.contributors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text not null default '',
  role text not null default 'Project Contributor',
  contribution text not null default '',
  biography text not null default '',
  display_order numeric(6,0) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null default '',
  full_name text not null default 'IRAKOZE Bright',
  title text not null default 'Founder & Creator — Discipline Management System',
  biography text not null default '',
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.help_articles (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null default '',
  slug text not null default '',
  order_index numeric(6,0) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('FREE','STARTER','PROFESSIONAL','ENTERPRISE')),
  price numeric(12,2) not null default 0,
  currency text not null default 'RWF',
  billing_period text not null default 'monthly' check (billing_period in ('monthly','annual')),
  features jsonb not null default '[]'::jsonb,
  max_people numeric(10,0) not null default 0,
  active boolean not null default true,
  order_index numeric(6,0) not null default 0,
  created_at timestamptz not null default now()
);

-- ===== Platform-owner console =====
create table if not exists public.platform_config (
  id uuid primary key default gen_random_uuid(),
  maintenance_mode boolean not null default false,
  system_version text not null default '1.0.0',
  system_health text not null default 'Healthy',
  visitor_count numeric(12,0) not null default 0,
  app_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target text not null default '',
  result text not null default 'Success',
  details text not null default '',
  user_name text not null default '',
  ip_address text not null default '',
  organization text not null default '',
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.platform_backups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'Completed',
  size text not null default '',
  details text not null default '',
  created_by_name text not null default '',
  created_at timestamptz not null default now()
);

-- ===== RLS =====
alter table public.structure_nodes enable row level security;
drop policy if exists structure_read_org on public.structure_nodes;
drop policy if exists structure_write_admin on public.structure_nodes;
drop policy if exists structure_write_teacher on public.structure_nodes;
create policy structure_read_org on public.structure_nodes for select to authenticated using (public.is_org_member(organization_id));
create policy structure_write_admin on public.structure_nodes for all to authenticated
  using (public.has_org_role(organization_id, array['org_admin','platform_owner']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['org_admin','platform_owner']::public.member_role[]));
create policy structure_write_teacher on public.structure_nodes for insert to authenticated
  with check (public.has_org_role(organization_id, array['teacher','staff']::public.member_role[]));

-- Public content: readable by everyone (anon included), writable only via service role.
alter table public.contributors enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.help_articles enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.platform_config enable row level security;
create policy contributors_public_read on public.contributors for select using (true);
create policy creator_public_read on public.creator_profiles for select using (true);
create policy help_public_read on public.help_articles for select using (true);
create policy plans_public_read on public.subscription_plans for select using (true);
create policy config_public_read on public.platform_config for select using (true);

-- Platform console tables: no client policies; the Express API (service role) owns them.
alter table public.platform_audit_logs enable row level security;
alter table public.platform_backups enable row level security;

-- Seed the config singleton and a default creator profile if absent.
insert into public.platform_config (system_version)
select '1.0.0' where not exists (select 1 from public.platform_config);
insert into public.creator_profiles (full_name, title, biography)
select 'IRAKOZE Bright', 'Founder & Creator — Discipline Management System',
       'Student developer from Rwanda building discipline tools for schools and organizations.'
where not exists (select 1 from public.creator_profiles);

-- Seed default subscription plans if absent.
insert into public.subscription_plans (name, price, currency, billing_period, features, max_people, order_index) values
  ('FREE', 0, 'RWF', 'monthly', '["Up to 50 people","Core discipline tracking","1 organization"]', 50, 1),
  ('STARTER', 5000, 'RWF', 'monthly', '["Up to 300 people","Reports and exports","Email support"]', 300, 2),
  ('PROFESSIONAL', 15000, 'RWF', 'monthly', '["Up to 1000 people","Advanced analytics","Priority support"]', 1000, 3),
  ('ENTERPRISE', 0, 'RWF', 'annual', '["Unlimited people","Custom structure","Dedicated support"]', 0, 4)
on conflict (name) do nothing;
