-- SDMS starter schema. Review policies and business rules before production use.
create extension if not exists pgcrypto;
create type public.discipline_track as enum ('HIGH_SCHOOL','UNIVERSITY','COMPANY','ORGANIZATION','COMMUNITY');
create type public.member_role as enum ('platform_owner','org_admin','teacher','staff','viewer');
create type public.person_status as enum ('Active','Suspended','Inactive','Under Review');
create type public.incident_severity as enum ('Minor','Moderate','Serious','N/A');
create type public.incident_status as enum ('Reported','Under Review','Confirmed','Resolved','Appealed','Closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', created_at timestamptz not null default now()
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null,
  type text not null check (type in ('High School','University','Company','Organization','Community')),
  track public.discipline_track not null, suspended boolean not null default false,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'viewer', created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create table public.persons (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  track public.discipline_track not null, full_name text not null, person_id text not null,
  gender text check (gender in ('Male','Female','Other')), date_of_birth date, guardian_contact text,
  academic_year text, faculty text, academic_department text, program text, year_of_study text, cohort text,
  role text not null default 'Member', date_joined date, status public.person_status not null default 'Active',
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique (organization_id, person_id)
);
create table public.violations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, description text not null default '', severity public.incident_severity not null default 'Minor',
  default_marks_deducted numeric(6,2) not null default 0 check (default_marks_deducted >= 0), active boolean not null default true,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique (organization_id, name)
);
create table public.incidents (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  track public.discipline_track not null, person_id uuid not null references public.persons(id) on delete restrict,
  term text not null default '1' check (term in ('1','2','3')), violation_id uuid references public.violations(id) on delete set null,
  violation_name text not null default '', reason text not null default '', description text not null default '',
  severity public.incident_severity not null default 'Minor', marks_deducted numeric(6,2) not null default 0 check (marks_deducted >= 0),
  incident_date date not null, location text not null default '', status public.incident_status not null default 'Reported',
  evidence_url text not null default '', witnesses text not null default '', counselling text not null default '', action_taken text not null default '',
  recorded_by text not null default '', created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null, action text not null, entity_type text not null,
  entity_id uuid, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index persons_org_name_idx on public.persons (organization_id, full_name);
create index incidents_org_date_idx on public.incidents (organization_id, incident_date desc);
create index incidents_person_idx on public.incidents (person_id);

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.organization_members m where m.organization_id = target_org and m.user_id = auth.uid()) $$;
create or replace function public.has_org_role(target_org uuid, allowed public.member_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.organization_members m where m.organization_id = target_org and m.user_id = auth.uid() and m.role = any(allowed)) $$;
revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, public.member_role[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.member_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.persons enable row level security;
alter table public.violations enable row level security;
alter table public.incidents enable row level security;
alter table public.audit_logs enable row level security;
create policy profile_read_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profile_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy organization_read_member on public.organizations for select to authenticated using (public.is_org_member(id));
create policy organization_update_admin on public.organizations for update to authenticated using (public.has_org_role(id, array['org_admin','platform_owner']::public.member_role[])) with check (public.has_org_role(id, array['org_admin','platform_owner']::public.member_role[]));
create policy membership_read_org on public.organization_members for select to authenticated using (user_id = auth.uid() or public.has_org_role(organization_id, array['org_admin','platform_owner']::public.member_role[]));
create policy persons_read_org on public.persons for select to authenticated using (public.is_org_member(organization_id));
create policy persons_insert_org on public.persons for insert to authenticated with check (public.has_org_role(organization_id, array['org_admin','teacher','staff','platform_owner']::public.member_role[]) and created_by = auth.uid());
create policy persons_update_org on public.persons for update to authenticated using (public.has_org_role(organization_id, array['org_admin','teacher','staff','platform_owner']::public.member_role[])) with check (public.has_org_role(organization_id, array['org_admin','teacher','staff','platform_owner']::public.member_role[]));
create policy persons_delete_admin on public.persons for delete to authenticated using (public.has_org_role(organization_id, array['org_admin','platform_owner']::public.member_role[]));
create policy violations_read_org on public.violations for select to authenticated using (public.is_org_member(organization_id));
create policy violations_manage_admin on public.violations for all to authenticated using (public.has_org_role(organization_id, array['org_admin','platform_owner']::public.member_role[])) with check (public.has_org_role(organization_id, array['org_admin','platform_owner']::public.member_role[]));
create policy incidents_read_org on public.incidents for select to authenticated using (public.is_org_member(organization_id));
create policy incidents_insert_org on public.incidents for insert to authenticated with check (public.has_org_role(organization_id, array['org_admin','teacher','staff','platform_owner']::public.member_role[]) and created_by = auth.uid());
create policy incidents_update_org on public.incidents for update to authenticated using (public.has_org_role(organization_id, array['org_admin','teacher','staff','platform_owner']::public.member_role[])) with check (public.has_org_role(organization_id, array['org_admin','teacher','staff','platform_owner']::public.member_role[]));
create policy incidents_delete_admin on public.incidents for delete to authenticated using (public.has_org_role(organization_id, array['org_admin','platform_owner']::public.member_role[]));
create policy audit_read_admin on public.audit_logs for select to authenticated using (organization_id is not null and public.has_org_role(organization_id, array['org_admin','platform_owner']::public.member_role[]));
-- No client write policies for audit logs; trusted server-side code should record audit events.
