# SDMS architecture and deployment

## Target architecture
- React frontend hosted on Vercel.
- Node.js + Express API hosted on Render.
- Supabase Auth for user sign-in and access tokens.
- Supabase-hosted PostgreSQL for application data.

## Status and scope
This repository currently contains a starter scaffold, not a completed migration of the original Base44 application. The provided source ZIP has many zero-byte files, including the app entry point and package manifest. The Base44 entity definitions are schema references only; no live database export was supplied.

## Setup outline
1. Create a Supabase project and configure Auth redirect URLs.
2. Review `supabase/migrations/001_initial_schema.sql` and apply it to a development project only after reviewing role and row-level-security assumptions.
3. Configure the Express service using `server/.env.example`; never commit a real `.env` file.
4. Configure the frontend using `frontend/.env.example` and install `@supabase/supabase-js` in the actual frontend project.
5. Deploy the frontend to Vercel and the API to Render, setting production environment variables in their dashboards.
6. Test role boundaries, tenant isolation, incident workflows, backup/restore and audit trails before production.

## Security requirements
- Never expose the Supabase service-role key in browser code or `VITE_` variables.
- Do not commit secrets, credentials, private keys, database dumps, or real student records.
- Do not let users self-assign privileged roles.
- Audit organization membership and all authorization checks.
- Use synthetic test data during development.

## Migration checklist
1. Obtain a complete, non-empty source export.
2. Inventory existing fields and business rules.
3. Export records through an authorized process and securely map legacy IDs.
4. Migrate parent tables before dependent records.
5. Compare row counts, relationships, permissions, and representative workflows.
6. Back up the old system and agree a rollback plan before switching traffic.

Do not treat this starter as a production-ready system until the full integration is implemented, reviewed and tested.