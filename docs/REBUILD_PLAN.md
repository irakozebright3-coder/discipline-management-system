# Discipline Management (DM) — Rebuild Plan v2

Owner/developer display name: **IRAKOZE Bright**. Live reference: https://discipline-management.vercel.app
(the current production app, built in this workspace — full internals known; inspected 2026-10-21).

## Stack (unchanged, proven in production)
- Frontend: React + Vite + Tailwind CSS (new DM design system, dark + light themes)
- Backend: Express on Vercel serverless functions (api/index.js), service-role Supabase server-side only
- Database: Supabase Postgres + Auth + private Storage bucket `dm-files` (evidence, photos)
- Deploy: Vercel (repo root), CI on GitHub Actions

## Phases
1. **Schema & security model** — 30-entity relational schema, RLS on every private table,
   tenant isolation via institution_id scoping + membership helpers, owner bootstrap preserved
   (platform_settings.owner_ids, first-registered-user fallback).
2. **Backend** — auth, institutions, memberships/invitations, people, org_units structure,
   incident engine (cases, evidence, reviews, decisions, appeals, follow-ups, corrective actions),
   scoring engine (score_transactions, term/annual math), notifications, support requests,
   audit logs, platform/owner routes, reports + CSV export (formula-injection safe).
3. **Design system & public site** — DM flag logo, tokens (Void Blue #0B0F19, Card Midnight
   #161F30, Electric Purple #8B5CF6, Neon Blue #3B82F6, Cyber Lime #10B981), glass/depth,
   reduced-motion aware, public pages (Home, Features, 3 Track pages, About, Contact,
   FAQs, Help Center, Privacy, Terms) + auth pages.
4. **App shell & institution module** — dashboard per role/track, people, structure, settings,
   user management/invitations, notifications, history, reports.
5. **Owner console** — institutions, platform users, platform settings/branding, help content,
   support requests, audit logs, system health.
6. **Testing** — automated API suite (auth, permissions, isolation, scoring math, workflow,
   exports), frontend production build, CI.
7. **Deployment** — push, CI green, Vercel-ready; production verification checklist.

## Key architecture decisions
- Scores derive from `score_transactions` (pending/approved/reversed) against
  `scoring_rules.starting_marks` (default 40/term, 120 annual). No stored term columns;
  pending deductions never count; corrections are reversal transactions (audit-preserving).
- University and organization tracks do NOT use the 40-mark model unless configured.
- Case workflow: draft → submitted → under_review → awaiting_decision → resolved →
  appealed → closed, with assignment, review, decision, appeal and follow-up subrecords.
- Evidence in private bucket; downloads only via server-issued short-lived signed URLs
  after membership check. Body limit 4 MB on serverless uploads.
- Exports: CSV server-side (formula-injection escaped); PDF via print-friendly report
  view (browser Print → Save as PDF) — disclosed, not faked.
- Emails: no SMTP provider configured; invitations deliver an in-app copyable link
  and an in-app notification on signup. Disclosed, not faked.
