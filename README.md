# Discipline Management System (SDMS)

Multi-tenant discipline tracking: organizations manage people, a violations catalog, and incidents with marks deduction, status workflow, and an audit trail. Vue 3 frontend, Node.js/Express API, Supabase Auth and Supabase PostgreSQL.

## Repository layout
- `frontend/` — runnable Vite + Vue 3 app: sign in/up, organization picker, overview, people, incidents, violations and admin pages, with a liquid-button design system, sliding-word titles, clustering-word canvas backdrop, 3D card tilt and view entrances, and reduced-motion fallbacks.
- `server/` — Express API with Supabase JWT validation, organization-scoped routes for persons, incidents, violations and organizations, plus audit logging.
- `supabase/migrations/` — PostgreSQL schema with row-level security policies.
- `docs/architecture-and-deployment.md` — deployment outline, migration checklist and security requirements.
- `.github/workflows/ci.yml` — CI: API syntax + boot smoke test and frontend production build.

## Features
- Email/password auth with Supabase; users see only organizations they belong to.
- Motion design system: liquid primary buttons, sliding-word headings, a clustering-words canvas on the login hero, 3D tilt cards and depth entrances — all disabled automatically under `prefers-reduced-motion`.
- Footer copyright year updates itself when the year rolls over.
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
- Frontend: Vercel (this repo is ready to deploy — see below)
- Express API: Render (root directory `server/`)
- Auth and PostgreSQL: Supabase

See [architecture and deployment notes](docs/architecture-and-deployment.md) before production setup.

### Deploying the full stack to Vercel

The repository ships with a root `vercel.json` that deploys BOTH the Vue frontend and the
Express API (as serverless functions) in a single Vercel project.

1. Go to [vercel.com/new](https://vercel.com/new) and import this repository.
2. Leave **Root Directory** as the repository root (do not set it to `frontend`).
3. Add these environment variables (enable them for Production):

   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase project URL, e.g. `https://<ref>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon (publishable) key |
   | `VITE_API_BASE_URL` | leave **empty** so the app calls `/api` on its own domain |
   | `SUPABASE_URL` | same as `VITE_SUPABASE_URL` |
   | `SUPABASE_ANON_KEY` | same as `VITE_SUPABASE_ANON_KEY` |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service-role (secret) key - server only |

   Copy the keys from Supabase Studio -> Project Settings -> API Keys.
   Never expose the service-role key to the frontend.

4. Deploy. Vercel builds the frontend and the `api/index.js` function; the app usually lands on
   `https://discipline-management-system.vercel.app`. Check `https://<your-domain>/health` -
   it should answer `{"ok":true,"service":"sdms-api"}`.

Same-origin API calls are allowed automatically; only cross-origin hosts need `CORS_ORIGINS`.
The `frontend/vercel.json` keeps SPA rewrites and immutable asset caching if you deploy the
frontend as its own project instead.

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
