import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireOrganizationRole, requireWriteRole, requireAdminRole } from '../middleware/auth.js';

const router = Router();
const personSchema = z.object({
  organization_id: z.string().uuid(), track: z.enum(['HIGH_SCHOOL','UNIVERSITY','COMPANY','ORGANIZATION','COMMUNITY']),
  full_name: z.string().trim().min(1).max(200), person_id: z.string().trim().min(1).max(100),
  gender: z.enum(['Male','Female','Other']).optional(), date_of_birth: z.string().date().optional(),
  photo_url: z.string().max(500).optional(),
  trade_id: z.string().max(100).nullable().optional(), class_id: z.string().max(100).nullable().optional(),
  department_id: z.string().max(100).nullable().optional(), office_id: z.string().max(100).nullable().optional(),
  guardian_contact: z.string().max(200).optional(), academic_year: z.string().max(30).optional(),
  guardian_name: z.string().max(200).optional(), guardian_phone: z.string().max(20).optional(),
  term1_marks: z.number().min(0).max(40).optional(), term2_marks: z.number().min(0).max(40).optional(),
  term3_marks: z.number().min(0).max(40).optional(),
  faculty: z.string().max(200).optional(), academic_department: z.string().max(200).optional(),
  program: z.string().max(200).optional(), year_of_study: z.string().max(50).optional(),
  cohort: z.string().max(100).optional(), role: z.string().max(100).optional(), date_joined: z.string().date().optional(),
  status: z.enum(['Active','Suspended','Inactive','Under Review']).optional()
});
const PHONE_RE = /^\+?[1-9]\d{6,14}$/;
function validateGuardian(body) {
  if (body.guardian_name !== undefined) body.guardian_name = String(body.guardian_name).trim();
  if (body.guardian_phone !== undefined) {
    body.guardian_phone = String(body.guardian_phone).trim();
    if (body.guardian_phone && !PHONE_RE.test(body.guardian_phone)) return 'Guardian phone must be a valid international number (e.g. +2507...).';
  }
  return null;
}

router.get('/', requireOrganizationRole, async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '50', 10) || 50, 1), 100);
  const { data, error } = await adminDb.from('persons').select('*').eq('organization_id', req.organizationId).order('full_name').limit(limit);
  if (error) return res.status(500).json({ error: 'Could not load people.' });
  res.json({ data });
});
router.post('/', requireOrganizationRole, requireWriteRole, async (req, res) => {
  const parsed = personSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid person data.', details: parsed.error.flatten() });
  const phoneError = validateGuardian(parsed.data);
  if (phoneError) return res.status(400).json({ error: phoneError });
  if (parsed.data.organization_id !== req.organizationId) return res.status(403).json({ error: 'Organization mismatch.' });
  const { data, error } = await adminDb.from('persons').insert({ ...parsed.data, created_by: req.user.id }).select().single();
  if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.code === '23505' ? 'This person ID already exists in the organization.' : 'Could not create person.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'create', entity_type: 'person', entity_id: data.id, details: { person_id: data.person_id } });
  res.status(201).json({ data });
});
export default router;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadPerson(id) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await adminDb.from('persons').select('*').eq('id', id).maybeSingle();
  return data || null;
}

router.get('/:id', requireOrganizationRole, async (req, res) => {
  const person = await loadPerson(req.params.id);
  if (!person || person.organization_id !== req.organizationId) {
    return res.status(404).json({ error: 'Person not found in this organization.' });
  }
  res.json({ data: person });
});

const personUpdateSchema = personSchema.partial().omit({ organization_id: true, track: true });
router.patch('/:id', requireOrganizationRole, requireWriteRole, async (req, res) => {
  const person = await loadPerson(req.params.id);
  if (!person || person.organization_id !== req.organizationId) {
    return res.status(404).json({ error: 'Person not found in this organization.' });
  }
  const parsed = personUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid person update.', details: parsed.error.flatten() });
  const phoneError = validateGuardian(parsed.data);
  if (phoneError) return res.status(400).json({ error: phoneError });
  if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
  const { data, error } = await adminDb.from('persons').update(parsed.data).eq('id', person.id).select().single();
  if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.code === '23505' ? 'This person ID already exists in the organization.' : 'Could not update person.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'update', entity_type: 'person', entity_id: data.id, details: { changes: parsed.data } });
  res.json({ data });
});

router.delete('/:id', requireOrganizationRole, requireAdminRole, async (req, res) => {
  const person = await loadPerson(req.params.id);
  if (!person || person.organization_id !== req.organizationId) {
    return res.status(404).json({ error: 'Person not found in this organization.' });
  }
  const { error } = await adminDb.from('persons').delete().eq('id', person.id);
  if (error) return res.status(400).json({ error: 'Could not delete person. Incidents may still reference them.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'delete', entity_type: 'person', entity_id: person.id, details: { person_id: person.person_id, full_name: person.full_name } });
  res.status(204).end();
});
