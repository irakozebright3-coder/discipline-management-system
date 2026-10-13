# Discipline Management System (SDMS)

Cloud-hosted SDMS starter targeting a React frontend, Node.js/Express API, Supabase Auth and Supabase PostgreSQL.

## Repository layout
- `frontend/` — Supabase browser client, authenticated API helper, auth examples and optional UI effects.
- `server/` — Express API starter with Supabase JWT validation and organization-scoped person/incident routes.
- `supabase/migrations/` — initial PostgreSQL schema and row-level security policies.
- `docs/architecture-and-deployment.md` — deployment outline, migration checklist and security requirements.

## Important project status
This is a **starter scaffold, not a complete or production-ready migration**. The supplied Base44 export has many zero-byte files, including its app entry point and package manifest. It cannot currently be built as a complete application without a full source export and integration work. The original export did not include a live database dump; no student records were uploaded.

## Deployment target
- Frontend: Vercel
- Express API: Render
- Auth and PostgreSQL: Supabase

See [architecture and deployment notes](docs/architecture-and-deployment.md) before setup.

## Local setup outline
1. Create a Supabase development project and review `supabase/migrations/001_initial_schema.sql` before applying it.
2. Copy `server/.env.example` to `server/.env` locally and fill in development values. Never commit real environment files.
3. Run `npm install` in `server/`, then `npm run dev`.
4. In the actual React/Vite frontend, install `@supabase/supabase-js`, configure `frontend/.env.example` values in your local environment, and integrate the helper modules.
5. Run security, authorization, and build tests with the complete app before deploying.

## Security
- Never commit credentials, private keys, real student records or database exports.
- The Supabase service-role key is server-only and must never be exposed in frontend code.
- Keep organization membership and role checks server-side, and test tenant isolation with separate test accounts.
- Use synthetic test data during development.
