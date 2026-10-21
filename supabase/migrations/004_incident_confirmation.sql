-- 004: Incident confirmation fields used by the discipline calculation
-- (confirming an incident deducts marks from the person's term marks).
alter table public.incidents add column if not exists confirmed boolean not null default false;
alter table public.incidents add column if not exists remaining_marks numeric(6,2);
alter table public.incidents add column if not exists month text not null default '';

-- Keep track consistent for incidents raised against orgs of other tracks.
create index if not exists incidents_person_term_idx on public.incidents (person_id, term);
create index if not exists incidents_org_status_idx on public.incidents (organization_id, status);
