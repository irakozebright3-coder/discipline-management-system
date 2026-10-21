import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const TYPE_BY_TRACK = {
  HIGH_SCHOOL: 'High School', UNIVERSITY: 'University', COMPANY: 'Company',
  ORGANIZATION: 'Organization', COMMUNITY: 'Community'
};
const HS_DEFAULT_VIOLATIONS = [
  ['Late coming', 2, 'Attendance'],
  ['Unauthorized absence', 3, 'Attendance'],
  ['Disrespect', 4, 'Conduct'],
  ['Fighting', 5, 'Conduct'],
  ['Uniform violation', 1, 'Appearance']
];
const OTHER_DEFAULT_VIOLATIONS = [
  ['Misconduct', 0, 'Conduct'],
  ['Insubordination', 0, 'Conduct'],
  ['Policy violation', 0, 'Policy'],
  ['Absenteeism', 0, 'Attendance']
];

const router = Router();

// Lists the organizations the signed-in user belongs to, with their role.
// Used by the frontend to pick an active organization without extra setup.
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await adminDb.from('organization_members')
    .select('role, organizations(id, name, type, track, suspended)')
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: 'Could not load your organizations.' });
  const rows = (data || []).filter(m => m.organizations).map(m => ({
    organization: m.organizations,
    role: m.role
  }));
  res.json({ data: rows });
});

export default router;

// Setup flow: create the organization, make the caller its org_admin,
// and initialize default violations for the chosen track.
router.post('/', requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1).max(200),
    track: z.enum(['HIGH_SCHOOL','UNIVERSITY','COMPANY','ORGANIZATION','COMMUNITY'])
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Organization name and discipline track are required.' });
  const { name, track } = parsed.data;

  const { data: existing } = await adminDb.from('organization_members')
    .select('organization_id').eq('user_id', req.user.id).limit(1).maybeSingle();
  if (existing) return res.status(409).json({ error: 'You already manage an organization.' });

  const { data: org, error: orgError } = await adminDb.from('organizations')
    .insert({ name, type: TYPE_BY_TRACK[track], track, created_by: req.user.id })
    .select().single();
  if (orgError) return res.status(400).json({ error: 'Could not create the organization.' });

  // Defensive: guarantee a profile row exists (a DB trigger normally does this on signup).
  await adminDb.from('profiles').upsert({
    id: req.user.id,
    full_name: req.user.user_metadata?.full_name || (req.user.email || '').split('@')[0]
  }, { onConflict: 'id' });
  const { error: memberError } = await adminDb.from('organization_members')
    .insert({ organization_id: org.id, user_id: req.user.id, role: 'org_admin' });
  if (memberError) {
    await adminDb.from('organizations').delete().eq('id', org.id);
    return res.status(400).json({ error: 'Could not register you as the organization admin.' });
  }

  const defaults = (track === 'HIGH_SCHOOL' ? HS_DEFAULT_VIOLATIONS : OTHER_DEFAULT_VIOLATIONS)
    .map(([vname, marks, category]) => ({
      organization_id: org.id, track, name: vname,
      default_marks_deducted: marks, category, created_by: req.user.id
    }));
  const { error: violError } = await adminDb.from('violations').insert(defaults);
  if (violError) console.error('Default violations failed:', violError.message);

  await adminDb.from('audit_logs').insert({
    organization_id: org.id, actor_id: req.user.id, action: 'create',
    entity_type: 'organization', entity_id: org.id, details: { name, track, defaults: defaults.length }
  });
  res.status(201).json({ data: { organization: org, role: 'org_admin' } });
});

