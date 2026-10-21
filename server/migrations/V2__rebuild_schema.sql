-- =====================================================================
-- Discipline Management (DM) v2 — full schema rebuild
-- One-shot migration: creates the new 30-entity schema, migrates the
-- existing production rows, then drops the superseded v1 tables.
-- Run with a transaction-capable client. Idempotent-by-drop for v1.
-- =====================================================================

begin;

-- ---------- preamble: move v1 tables aside (data preserved), drop v1 helpers ----------
drop function if exists public.has_org_role(uuid, text[]) cascade;
drop function if exists public.is_org_member(uuid) cascade;
alter table public.organizations rename to v1_organizations;
alter table public.organization_members rename to v1_organization_members;
alter table public.persons rename to v1_persons;
alter table public.incidents rename to v1_incidents;
alter table public.violations rename to v1_violations;
alter table public.structure_nodes rename to v1_structure_nodes;
alter table public.audit_logs rename to v1_audit_logs;
alter table public.platform_config rename to v1_platform_config;


-- ---------- shared enums ----------
do $$ begin
  create type dm_role as enum ('platform_owner','institution_admin','disciplinary_officer','reviewer','staff','auditor');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_inst_status as enum ('active','suspended','archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_case_status as enum ('draft','submitted','under_review','awaiting_decision','resolved','appealed','closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_severity as enum ('minor','moderate','serious','not_applicable');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_unit_type as enum ('academic_year','term','class','stream','trade','subject','department','program','cohort','branch','office','position');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_person_type as enum ('student','staff','member','worker','officer','partner','other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_person_status as enum ('active','suspended','inactive','under_review','archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_score_kind as enum ('deduction','adjustment','reversal');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_score_status as enum ('pending','approved','reversed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_decision as enum ('approved','dismissed','escalated','other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_appeal_status as enum ('submitted','under_review','upheld','overturned','rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_fu_status as enum ('open','in_progress','completed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type dm_support_status as enum ('open','in_progress','resolved','closed');
exception when duplicate_object then null; end $$;

-- ---------- 1. institutions (migrated from organizations) ----------
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('HIGH_SCHOOL','UNIVERSITY','COMPANY','ORGANIZATION','COMMUNITY')),
  track text not null,
  logo_url text,
  email text,
  phone text,
  address text,
  timezone text not null default 'Africa/Kigali',
  status dm_inst_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- ---------- 2. institution_memberships ----------
create table public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role dm_role not null default 'staff',
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  invited_by uuid references auth.users(id) on delete set null,
  unique (institution_id, user_id)
);

-- ---------- 3. invitations ----------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  email text not null,
  role dm_role not null default 'staff',
  token text not null unique default encode(gen_random_bytes(24),'hex'),
  status text not null default 'pending' check (status in ('pending','accepted','cancelled','expired')),
  created_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  unique (institution_id, email)
);

-- ---------- 4. scoring rules & institution settings ----------
create table public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null default 'Default',
  starting_marks numeric not null default 40 check (starting_marks > 0),
  term_count int not null default 3 check (term_count between 1 and 3),
  max_annual numeric not null default 120,
  allow_negative boolean not null default false,
  active boolean not null default true,
  unique (institution_id, name)
);

create table public.institution_settings (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- 5. org_units (academic + org structure, typed) ----------
create table public.org_units (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  unit_type dm_unit_type not null,
  name text not null,
  parent_id uuid references public.org_units(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (institution_id, unit_type, name)
);

-- ---------- 6. people (migrated from persons) ----------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  person_id text not null,
  full_name text not null,
  photo_url text,
  person_type dm_person_type not null default 'student',
  gender text,
  date_of_birth date,
  status dm_person_status not null default 'active',
  class_unit_id uuid references public.org_units(id) on delete set null,
  trade_unit_id uuid references public.org_units(id) on delete set null,
  department_unit_id uuid references public.org_units(id) on delete set null,
  program_unit_id uuid references public.org_units(id) on delete set null,
  cohort_unit_id uuid references public.org_units(id) on delete set null,
  academic_year text,
  guardian_name text,
  guardian_phone text,
  guardian_contact text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (institution_id, person_id)
);

create table public.person_enrollments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  unit_id uuid not null references public.org_units(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  status text not null default 'active',
  unique (person_id, unit_id)
);

-- ---------- 7. incident categories (migrated from violations) ----------
create table public.incident_categories (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  category text,
  description text,
  severity dm_severity not null default 'minor',
  default_deduction numeric not null default 0 check (default_deduction >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (institution_id, name)
);

-- ---------- 8. incidents / cases (migrated from v1 incidents) ----------
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  case_number text not null,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  track text not null,
  person_id uuid not null references public.people(id) on delete restrict,
  category_id uuid references public.incident_categories(id) on delete set null,
  category_name text,
  severity dm_severity not null default 'minor',
  description text,
  location text,
  reason text,
  incident_date date not null,
  term int check (term between 1 and 3),
  month text,
  status dm_case_status not null default 'submitted',
  assigned_officer_user_id uuid references auth.users(id) on delete set null,
  follow_up_date date,
  closure_date date,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (institution_id, case_number)
);

-- case number sequence per institution
create table public.case_counters (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  last_value int not null default 0
);

-- ---------- 9. evidence ----------
create table public.incident_evidence (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  description text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- 10-16. workflow subrecords ----------
create table public.case_assignments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  officer_user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.case_reviews (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  notes text not null,
  outcome text,
  created_at timestamptz not null default now()
);

create table public.case_decisions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  decided_by uuid not null references auth.users(id) on delete cascade,
  decision dm_decision not null,
  rationale text not null,
  corrective_action text,
  deduction_amount numeric not null default 0 check (deduction_amount >= 0),
  created_at timestamptz not null default now()
);

create table public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  action text not null,
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  status dm_fu_status not null default 'open',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status dm_appeal_status not null default 'submitted',
  reviewed_by uuid references auth.users(id) on delete set null,
  outcome text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  incident_id uuid references public.incidents(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  title text not null,
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  status dm_fu_status not null default 'open',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- 17. score transactions ----------
create table public.score_transactions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  incident_id uuid references public.incidents(id) on delete set null,
  term int not null check (term between 1 and 3),
  amount numeric not null check (amount >= 0),
  kind dm_score_kind not null default 'deduction',
  status dm_score_status not null default 'pending',
  note text,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- 18-21. notifications / audit / support / platform ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs_v2 (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  institution_id uuid references public.institutions(id) on delete set null,
  status dm_support_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ---------- helper functions (RLS) ----------

create table public.platform_settings (
  id int primary key default 1 check (id = 1),
  app_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.is_platform_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    exists (select 1 from public.platform_settings s
            where s.app_settings->'owner_ids' @> to_jsonb(auth.uid()::text)), false);
$$;

create or replace function public.has_institution_role(inst uuid, roles dm_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.institution_memberships m
    where m.institution_id = inst and m.user_id = auth.uid()
      and m.role = any(roles) and m.status = 'active')
  or public.is_platform_owner();
$$;

create or replace function public.is_institution_member(inst uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_institution_role(inst, array['platform_owner','institution_admin','disciplinary_officer','reviewer','staff','auditor']::dm_role[]);
$$;


-- ---------- indexes ----------
create index idx_inst_memberships_user on public.institution_memberships(user_id);
create index idx_invitations_email on public.invitations(email);
create index idx_org_units_inst on public.org_units(institution_id, unit_type);
create index idx_people_inst_name on public.people(institution_id, full_name);
create index idx_people_inst_status on public.people(institution_id, status);
create index idx_categories_inst on public.incident_categories(institution_id, active);
create index idx_incidents_inst_status on public.incidents(institution_id, status);
create index idx_incidents_inst_date on public.incidents(institution_id, incident_date desc);
create index idx_incidents_person on public.incidents(person_id);
create index idx_evidence_incident on public.incident_evidence(incident_id);
create index idx_assignments_incident on public.case_assignments(incident_id);
create index idx_reviews_incident on public.case_reviews(incident_id);
create index idx_decisions_incident on public.case_decisions(incident_id);
create index idx_corrective_incident on public.corrective_actions(incident_id);
create index idx_appeals_incident on public.appeals(incident_id);
create index idx_followups_inst on public.follow_up_tasks(institution_id, status);
create index idx_score_tx_person on public.score_transactions(person_id, term, status);
create index idx_score_tx_inst on public.score_transactions(institution_id);
create index idx_notifications_user on public.notifications(user_id, read_at);
create index idx_audit_v2_inst on public.audit_logs_v2(institution_id, created_at desc);
create index idx_support_status on public.support_requests(status, created_at desc);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_inst_touch before update on public.institutions for each row execute function public.touch_updated_at();
create trigger trg_people_touch before update on public.people for each row execute function public.touch_updated_at();
create trigger trg_incidents_touch before update on public.incidents for each row execute function public.touch_updated_at();
create trigger trg_settings_touch before update on public.institution_settings for each row execute function public.touch_updated_at();

-- ---------- storage bucket (private) ----------
insert into storage.buckets (id, name, public) values ('dm-files','dm-files', false)
on conflict (id) do nothing;

-- =====================================================================
-- MIGRATE v1 DATA (production org -> institution), then drop v1 tables
-- =====================================================================
insert into public.institutions (id, name, type, track, timezone, status, created_at, created_by)
select o.id, o.name,
       case upper(replace(o.type,' ','_')) when 'HIGH_SCHOOL' then 'HIGH_SCHOOL'
            when 'UNIVERSITY' then 'UNIVERSITY' when 'COMPANY' then 'COMPANY'
            when 'ORGANIZATION' then 'ORGANIZATION' when 'COMMUNITY' then 'COMMUNITY'
            else 'HIGH_SCHOOL' end,
       o.track::text, 'Africa/Kigali',
       case when o.suspended then 'suspended'::dm_inst_status else 'active'::dm_inst_status end,
       o.created_at, o.created_by
from public.v1_organizations o
on conflict (id) do nothing;

insert into public.institution_memberships (institution_id, user_id, role, status, created_at)
select m.organization_id, m.user_id,
       case m.role when 'org_admin' then 'institution_admin'::dm_role
                   when 'teacher' then 'disciplinary_officer'::dm_role
                   when 'staff' then 'staff'::dm_role
                   when 'viewer' then 'auditor'::dm_role
                   else 'staff'::dm_role end,
       'active', m.created_at
from public.v1_organization_members m
on conflict (institution_id, user_id) do nothing;

insert into public.incident_categories (id, institution_id, name, category, description, severity, default_deduction, active, created_at)
select v.id, v.organization_id, v.name, v.category, v.description,
       case lower(v.severity::text) when 'minor' then 'minor'::dm_severity
            when 'moderate' then 'moderate'::dm_severity
            when 'serious' then 'serious'::dm_severity
            else 'not_applicable'::dm_severity end,
       coalesce(v.default_marks_deducted, 0), coalesce(v.active, true), v.created_at
from public.v1_violations v
on conflict (institution_id, name) do nothing;

insert into public.org_units (institution_id, unit_type, name)
select s.organization_id, 'class'::dm_unit_type, s.name
from public.v1_structure_nodes s where s.node_type = 'class'
on conflict (institution_id, unit_type, name) do nothing;
insert into public.org_units (institution_id, unit_type, name)
select s.organization_id, 'trade'::dm_unit_type, s.name
from public.v1_structure_nodes s where s.node_type = 'trade'
on conflict (institution_id, unit_type, name) do nothing;

-- people: v1 had 0 rows; generic copy kept for safety
insert into public.people (id, institution_id, person_id, full_name, gender, date_of_birth, status, class_unit_id, trade_unit_id, academic_year, guardian_name, guardian_phone, guardian_contact, created_at, created_by)
select p.id, p.organization_id, p.person_id, p.full_name, p.gender, p.date_of_birth,
       case p.status::text when 'Active' then 'active'::dm_person_status
            when 'Suspended' then 'suspended'::dm_person_status
            when 'Inactive' then 'inactive'::dm_person_status
            when 'Under Review' then 'under_review'::dm_person_status
            else 'active'::dm_person_status end,
       (select u.id from public.org_units u where u.institution_id = p.organization_id and u.unit_type='class' and u.name = p.class_id limit 1),
       (select u.id from public.org_units u where u.institution_id = p.organization_id and u.unit_type='trade' and u.name = p.trade_id limit 1),
       p.academic_year, p.guardian_name, p.guardian_phone, p.guardian_contact, p.created_at, p.created_by
from public.v1_persons p
on conflict (institution_id, person_id) do nothing;

-- incidents: v1 had 0 rows; generic copy kept for safety
insert into public.incidents (id, case_number, institution_id, track, person_id, category_id, category_name, severity, description, location, reason, incident_date, term, month, status, assigned_officer_user_id, created_at, created_by)
select i.id, 'MIG-' || left(i.id::text, 8), i.organization_id, i.track, i.person_id, i.violation_id,
       coalesce((select v.name from public.v1_violations v where v.id = i.violation_id), i.violation_name, i.reason),
       case when i.severity::text = 'Minor' then 'minor'::dm_severity
            when i.severity = 'Moderate' then 'moderate'::dm_severity
            when i.severity = 'Serious' then 'serious'::dm_severity
            else 'not_applicable'::dm_severity end,
       i.description, i.location, i.reason, i.incident_date::date,
       case i.term::text when '1' then 1 when '2' then 2 when '3' then 3 else null end,
       i.month,
       case when i.status::text = 'Confirmed' then 'resolved'::dm_case_status
            when i.status::text = 'Reported' then 'submitted'::dm_case_status
            when i.status::text = 'Under Review' then 'under_review'::dm_case_status
            when i.status::text in ('Resolved','Closed') then 'closed'::dm_case_status
            when i.status::text = 'Appealed' then 'appealed'::dm_case_status
            else 'under_review'::dm_case_status end,
       null, i.created_at, i.created_by
from public.v1_incidents i
on conflict (institution_id, case_number) do nothing;

-- audit history preserved under v2 table
insert into public.audit_logs_v2 (institution_id, actor_id, actor_name, action, entity_type, entity_id, details, created_at)
select a.organization_id, a.actor_id, null, a.action, a.entity_type, a.entity_id::text, a.details, a.created_at
from public.v1_audit_logs a;

insert into public.platform_settings (id, app_settings, updated_at)
select 1, c.app_settings, c.updated_at from public.v1_platform_config c
on conflict (id) do update set app_settings = excluded.app_settings;

insert into public.platform_audit_logs (action, target, details, user_name, actor_id, result, created_at)
select 'system.rebuild_schema', 'platform', 'Discipline Management v2 schema migration applied.', 'system', null, 'Success', now()
where not exists (select 1 from public.platform_audit_logs where action = 'system.rebuild_schema');

-- seed scoring rules + settings for every existing institution
insert into public.scoring_rules (institution_id, name, starting_marks, term_count, max_annual)
select i.id, 'Default', 40, 3, 120 from public.institutions i
on conflict (institution_id, name) do nothing;

insert into public.institution_settings (institution_id)
select i.id from public.institutions i
on conflict (institution_id) do nothing;

-- ---------- drop v1 tables (data already copied above) ----------
drop table if exists public.v1_incidents cascade;
drop table if exists public.v1_persons cascade;
drop table if exists public.v1_violations cascade;
drop table if exists public.v1_structure_nodes cascade;
drop table if exists public.v1_audit_logs cascade;
drop table if exists public.v1_organization_members cascade;
drop table if exists public.v1_organizations cascade;
drop table if exists public.v1_platform_config cascade;

alter table public.audit_logs_v2 rename to audit_logs;

-- ---------- RLS ----------
alter table public.institutions enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.scoring_rules enable row level security;
alter table public.institution_settings enable row level security;
alter table public.org_units enable row level security;
alter table public.people enable row level security;
alter table public.person_enrollments enable row level security;
alter table public.incident_categories enable row level security;
alter table public.incidents enable row level security;
alter table public.case_counters enable row level security;
alter table public.incident_evidence enable row level security;
alter table public.case_assignments enable row level security;
alter table public.case_reviews enable row level security;
alter table public.case_decisions enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.appeals enable row level security;
alter table public.follow_up_tasks enable row level security;
alter table public.score_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.support_requests enable row level security;
alter table public.platform_settings enable row level security;

-- read: any active member of the institution (or platform owner)
create policy p_read on public.institutions for select
  using (public.is_institution_member(id) or public.is_platform_owner() or status = 'active');
create policy p_members_read on public.institution_memberships for select
  using (public.is_institution_member(institution_id) or user_id = auth.uid());
create policy p_invitations_read on public.invitations for select
  using (public.is_institution_member(institution_id) or lower(email) = lower(auth.email()::text));
create policy p_scoring_read on public.scoring_rules for select using (public.is_institution_member(institution_id));
create policy p_settings_read on public.institution_settings for select using (public.is_institution_member(institution_id));
create policy p_units_read on public.org_units for select using (public.is_institution_member(institution_id));
create policy p_people_read on public.people for select using (public.is_institution_member(institution_id));
create policy p_enroll_read on public.person_enrollments for select using (public.is_institution_member((select p.institution_id from public.people p where p.id = person_enrollments.person_id)));
create policy p_categories_read on public.incident_categories for select using (public.is_institution_member(institution_id));
create policy p_incidents_read on public.incidents for select using (public.is_institution_member(institution_id));
create policy p_counters_read on public.case_counters for select using (public.is_institution_member(institution_id));
create policy p_evidence_read on public.incident_evidence for select using (public.is_institution_member((select i.institution_id from public.incidents i where i.id = incident_id)));
create policy p_assignments_read on public.case_assignments for select using (public.is_institution_member((select i.institution_id from public.incidents i where i.id = incident_id)));
create policy p_reviews_read on public.case_reviews for select using (public.is_institution_member((select i.institution_id from public.incidents i where i.id = incident_id)));
create policy p_decisions_read on public.case_decisions for select using (public.is_institution_member((select i.institution_id from public.incidents i where i.id = incident_id)));
create policy p_corrective_read on public.corrective_actions for select using (public.is_institution_member((select i.institution_id from public.incidents i where i.id = incident_id)));
create policy p_appeals_read on public.appeals for select using (public.is_institution_member((select i.institution_id from public.incidents i where i.id = incident_id)));
create policy p_followups_read on public.follow_up_tasks for select using (public.is_institution_member(institution_id));
create policy p_score_read on public.score_transactions for select using (public.is_institution_member(institution_id));
create policy p_notif_read on public.notifications for select using (user_id = auth.uid());
create policy p_audit_read on public.audit_logs for select using (public.is_institution_member(institution_id));
create policy p_platform_read on public.platform_settings for select using (true);

-- writes go through the server (service role bypasses RLS); anon cannot write
create policy p_notif_write on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_platform_owner_write on public.platform_settings for update using (public.is_platform_owner()) with check (public.is_platform_owner());

commit;
