# Discipline Management System (SDMS)

Multi-tenant discipline tracking: organizations manage people, a violations catalog, and incidents with marks deduction, status workflow, and an audit trail. React frontend, Node.js/Express API, Supabase Auth and Supabase PostgreSQL.

## Repository layout
- `frontend/` — runnable Vite + React app: sign in/up, organization picker, people, incidents and violations pages.
- `server/` — Express API with Supabase JWT validation, organization-scoped routes for persons, incidents, violations and organizations, plus audit logging.
- `supabase/migrations/` — PostgreSQL schema with row-level security policies.
- `docs/architecture-and-deployment.md` — deployment outline, migration checklist and security requirements.
- `.github/workflows/ci.yml` — CI: API syntax + boot smoke test and frontend production build.

## Features
- Email/password auth with Supabase; users see only organizations they belong to.
- People management per organization (status workflow, admin-only deletes).
- Violations catalog per organization (admin-managed, with default marks).
- Incident recording with severity, marks deducted, location, witnesses, counselling and action taken.
- Incident status workflow: Reported → Under Review → Confirmed → Resolved / Appealed / Closed.
- Role-based access: `platform_owner`, `org_admin`, `teacher`, `staff`, `viewer`. Writes require teacher/staff/admin; deletes and catalog management require admin.
- Every create, update and delete is written to `audit_logs`.

## Local development
1. Create a Supabase project (free tier is fine) and apply `supabase/migrations/001_initial_schema.sql` in the SQL editor.
2. In Supabase Auth, enable the Email provider. Create a first user, then insert an organization and your membership:
   ```sql
   insert into public.organizations (name, type, track, created_by)
   values ('Karenge Adventist Secondary School', 'High School', 'HIGH_SCHOOL', auth.uid());
   insert into public.organization_members (organization_id, user_id, role)
   select id, created_by, 'org_admin' from public.organizations limit 1;
   ```
3. Copy `server/.env.example` to `server/.env`, fill in your Supabase URL and keys, then:
   ```bash
   cd server && npm install && npm run dev   # API on http://localhost:4000
   ```
4. Copy `frontend/.env.example` values into `frontend/.env`, then:
   ```bash
   cd frontend && npm install && npm run dev # app on http://localhost:5173
   ```

## Deployment target
- Frontend: Vercel (build command `npm run build` in `frontend/`)
- Express API: Render (root directory `server/`)
- Auth and PostgreSQL: Supabase

See [architecture and deployment notes](docs/architecture-and-deployment.md) before production setup.

## Security
- Never commit credentials, private keys, real student records or database exports. Use synthetic test data during development.
- The Supabase service-role key is server-only and must never be exposed in frontend code.
- Organization membership and role checks happen server-side on every request; tenant isolation is also enforced by row-level security.
- Test with separate accounts per role before deploying.

## Roadmap
- Bulk CSV import of people
- Marks / conduct-score dashboard per person and per term
- Guardian notification emails
- Audit log viewer for admins
- End-to-end tests with a CI Supabase preview database

## History
This repository started as a scaffold exported from an earlier Base44 application whose export was incomplete. It has since been rebuilt into a working codebase; the original migration notes are preserved in [docs](docs/architecture-and-deployment.md).
