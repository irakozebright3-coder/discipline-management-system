# Entity gap analysis — original Base44 export vs current schema

Compared against the uploaded Base44 export (174 files; 144 of them zero-byte, including
app entry, components and package manifest). The only recoverable content in the export
is 11 entity schema definitions, reviewed below against
`supabase/migrations/001_initial_schema.sql`.

Legend: ✅ covered · ⚠️ field-level gap · ❌ entity not ported

## Core discipline entities

### Person ⚠️ mostly covered
| Zip field | Current schema |
|---|---|
| full_name, person_id, gender, date_of_birth, guardian_contact, academic_year, faculty, academic_department, program, year_of_study, cohort, role, date_joined, status, organization_id, track | ✅ present |
| photo_url | ⚠️ missing |
| class_id, trade_id, department_id, office_id | ⚠️ missing (school-structure references, see StructureNode) |
| term1_marks, term2_marks, term3_marks (default 40 each) | ❌ missing — the conduct-marks baseline system |

### Incident ⚠️ mostly covered
| Zip field | Current schema |
|---|---|
| person_id, term, violation_id, violation_name, reason, description, severity, marks_deducted, location, status, evidence_url, witnesses, counselling, recorded_by, organization_id, track | ✅ present |
| date | ✅ renamed `incident_date` |
| action | ✅ renamed `action_taken` |
| person_name | ✅ computed via join, not stored (better) |
| remaining_marks | ❌ missing — per-term remaining conduct marks |
| confirmed (bool) | ⚠️ modeled by status workflow instead; not a separate flag |
| month | ❌ missing (derivable from incident_date) |

### Organization ⚠️ mostly covered
| Zip field | Current schema |
|---|---|
| name, type, track, suspended | ✅ present |
| settings (object) | ⚠️ missing |
| admin_name | ✅ better handled by `organization_members` roles |
| (zip has no membership table) | ✅ current schema adds it (multi-member, role-based) |

### AuditLog ✅ covered and extended
Current `audit_logs` is a superset (adds `actor_id`, JSONB `details`, timestamps).
The export's per-user RLS was replaced by admin-read + server-write, which is stricter.

### Violation ✅ covered
The export's `Violation.jsonC` is zero-byte; the current catalog (severity,
default marks, active flag) was rebuilt from the Incident schema and app behavior.

## Platform / community layer — not ported

These entities exist in the export but have no counterpart yet:

| Entity | Purpose | Status |
|---|---|---|
| StructureNode | Org hierarchy (classes, trades, departments, offices) with parent links | ❌ |
| PlatformConfig | Maintenance mode, system version, health, visitor count, app settings | ❌ |
| PlatformAuditLog | Platform-owner level audit (IP, user name, organization) | ❌ |
| PlatformBackup | Backup job records | ❌ |
| HelpArticle | Help/FAQ content by category with ordering | ❌ |
| CreatorProfile | Public creator/marketing info | ❌ |
| Contributor | Project contributor showcase | ❌ |
| SubscriptionPlan | (zero-byte in export — unknown fields) | ❌ |
| User | (zero-byte; standard Base44 user) | ✅ covered by Supabase Auth + profiles |

## Recommended next migration (002)

1. Add `term1_marks`, `term2_marks`, `term3_marks` to `persons` (numeric, default 40) and `remaining_marks` to `incidents` — restores the marks/conduct-score system that drives discipline tracking.
2. Add `settings jsonb` to `organizations`; optionally `photo_url` to `persons`.
3. Defer the platform layer (PlatformConfig, PlatformAuditLog, PlatformBackup, HelpArticle, CreatorProfile, Contributor, SubscriptionPlan, StructureNode) until the core app is deployed and in use; it is public-facing/admin tooling, not required by the discipline workflow.
