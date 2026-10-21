# Discipline Management System (SDMS)

Multi-tenant discipline tracking: organizations manage people, a violations catalog, and incidents with marks deduction, status workflow, and an audit trail. Vue 3 frontend, Node.js/Express API, Supabase Auth and Supabase PostgreSQL.

## Repository layout
- `frontend/` — runnable Vite + Vue 3 app: sign in/up, organization picker, overview, people, incidents, violations and admin pages, with a liquid-button design system, sliding-word titles, clustering-word canvas backdrop, 3D card tilt and view entrances, and reduced-motion fallbacks.
- `server/` — Express API with Supabase JWT validation, organization-scoped routes for persons, incidents, violations and organizations, plus audit logging.
- `supabase/migrations/` — PostgreSQL schema with row-level security policies:
  - `001_initial_schema.sql` — base schema (organizations, members, persons, violations, incidents, audit log).
  - `002_spec_features.sql` — person spec fields (term marks, guardian, class/trade), violation category, structure nodes, public content, subscription plans, platform console tables.
  - `003_fixes.sql` — violation `track` column and the `on_auth_user_created` profile trigger.
  - `004_incident_confirmation.sql` — incident `confirmed` / `remaining_marks` / `month` columns and indexes.
- `docs/architecture-and-deployment.md` — deployment outline, migration checklist and security requirements.
- `.github/workflows/ci.yml` — CI: API syntax + boot smoke test and frontend production build.

## Features
- Email/password auth with Supabase; users see only organizations they belong to.
- Motion design system: liquid primary buttons, sliding-word headings, a clustering-words canvas on the public hero, 3D tilt cards and depth entrances — all disabled automatically under `prefers-reduced-motion`.
- Footer copyright year updates itself when the year rolls over.
- **Public pages** (no sign-in): landing with live community stats, About, Community (contributors + creator profile), Help Center (articles by category).
- **Organization setup**: a signed-in user with no organization creates one at `/setup` (name + discipline track); default violations for the track are seeded automatically and the creator becomes `org_admin`.
- **People / Students** per track, with HIGH_SCHOOL fields (class, trade, term marks, optional parent/guardian name + international phone validated against `^\+?[1-9]\d{6,14}$`, trimmed before save). Legacy `guardian_contact` is preserved.
- **Student score card**: profile, discipline card (term marks, annual score /120, annual percentage, rating), guardian card with an empty state, incident history, inline edit, and "move class".
- **Structure**: track-adapted organization nodes — trades/classes (high school), faculties/departments/programs/years (university), departments/offices/roles (company, organization, community).
- **Violations catalog** per organization with category and default marks deduction.
- **Incidents**: severity, marks deducted, location, witnesses, counselling, action taken, status workflow (Reported → Under Review → Confirmed → Resolved / Appealed / Closed). Confirming an incident deducts its marks from the person's term marks, clamps at 0, records `remaining_marks`, and never deducts twice.
- **History** with search and status/term filters. **Reports** with term/severity/top-violation summaries, a discipline watchlist, and CSV export.
- **Settings** with organization details and the full audit trail.
- **Platform owner console**: dashboard stats, organizations, users, platform + organization audit logs, backup records, system config (maintenance mode, version, health), and content management (creator profile, contributors, help articles).
- Role-based access: `platform_owner`, `org_admin`, `teacher`, `staff`, `viewer`. Writes require teacher/staff/admin; deletes and catalog management require admin.
- Every create, update and delete is written to `audit_logs`; platform actions go to `platform_audit_logs`.

## Platform owner access
Priority order:
1. `PLATFORM_OWNER_EMAILS` environment variable (comma-separated emails).
2. `platform_config.app_settings.owner_ids` (user ids).
3. A `platform_owner` role in `organization_members`.
4. First-user bootstrap: on a fresh install with no owner configured anywhere, the first authenticated user to open the platform console claims ownership (recorded in `app_settings` and the platform audit log).

## Discipline calculations (fixed rules)
- `HS_MAX = 40` per term, `HS_ANNUAL_MAX = 120`.
- Missing term marks count as 40.
- Annual score = term1 + term2 + term3; annual percentage = annual / 120 × 100.
- Confirming an incident deducts `marks_deducted` from that term, clamped at 0.

## Default violations seeded on setup
- HIGH_SCHOOL: Late coming (2, Attendance), Unauthorized absence (3, Attendance), Disrespect (4, Conduct), Fighting (5, Conduct), Uniform violation (1, Appearance).
- Other tracks: Misconduct (Conduct), Insubordination (Conduct), Policy violation (Policy), Absenteeism (Attendance) — all 0 marks.

## Local development
1. Create a Supabase project (free tier is fine) and apply the migrations in `supabase/migrations/` in order (001 → 004).
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
