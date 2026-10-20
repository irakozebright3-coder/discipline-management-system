import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireOrganizationRole, requireWriteRole, requireAdminRole } from '../middleware/auth.js';

const router = Router();
const incidentSchema = z.object({
  organization_id: z.string().uuid(), track: z.enum(['HIGH_SCHOOL','UNIVERSITY','COMPANY','ORGANIZATION','COMMUNITY']),
  person_id: z.string().uuid(), term: z.enum(['1','2','3']).optional(), violation_id: z.string().uuid().nullable().optional(),
  violation_name: z.string().max(200).optional(), reason: z.string().max(1000).optional(), description: z.string().max(10000).optional(),
  severity: z.enum(['Minor','Moderate','Serious','N/A']).optional(), marks_deducted: z.number().min(0).max(100000).optional(),
  remaining_marks: z.number().nullable().optional(), incident_date: z.string().date(), location: z.string().max(300).optional(),
  status: z.enum(['Reported','Under Review','Confirmed','Resolved','Appealed','Closed']).optional(),
  evidence_url: z.string().max(2000).optional(), witnesses: z.string().max(3000).optional(), counselling: z.string().max(5000).optional(),
  action_taken: z.string().max(5000).optional(), recorded_by: z.string().max(200).optional()
});
router.get('/', requireOrganizationRole, async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '50', 10) || 50, 1), 100);
  const { data, error } = await adminDb.from('incidents').select('*, persons!inner(full_name, person_id)').eq('organization_id', req.organizationId).order('incident_date', { ascending: false }).limit(limit);
  if (error) return res.status(500).json({ error: 'Could not load incidents.' });
  res.json({ data });
});
router.post('/', requireOrganizationRole, requireWriteRole, async (req, res) => {
  const parsed = incidentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid incident data.', details: parsed.error.flatten() });
  if (parsed.data.organization_id !== req.organizationId) return res.status(403).json({ error: 'Organization mismatch.' });
  const { data: person, error: personError } = await adminDb.from('persons').select('id, organization_id').eq('id', parsed.data.person_id).maybeSingle();
  if (personError || !person || person.organization_id !== req.organizationId) return res.status(400).json({ error: 'Person not found in this organization.' });
  if (parsed.data.violation_id) {
    const { data: violation } = await adminDb.from('violations').select('id, organization_id').eq('id', parsed.data.violation_id).maybeSingle();
    if (!violation || violation.organization_id !== req.organizationId) return res.status(400).json({ error: 'Violation not found in this organization.' });
  }
  const { data, error } = await adminDb.from('incidents').insert({ ...parsed.data, created_by: req.user.id }).select().single();
  if (error) return res.status(400).json({ error: 'Could not create incident.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'create', entity_type: 'incident', entity_id: data.id, details: { person_id: data.person_id, status: data.status } });
  res.status(201).json({ data });
});
export default router;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadIncident(id) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await adminDb.from('incidents').select('*').eq('id', id).maybeSingle();
  return data || null;
}

router.get('/:id', requireOrganizationRole, async (req, res) => {
  const incident = await loadIncident(req.params.id);
  if (!incident || incident.organization_id !== req.organizationId) {
    return res.status(404).json({ error: 'Incident not found in this organization.' });
  }
  const { data: person } = await adminDb.from('persons').select('full_name, person_id').eq('id', incident.person_id).maybeSingle();
  res.json({ data: { ...incident, person: person || null } });
});

const incidentUpdateSchema = z.object({
  term: z.enum(['1','2','3']).optional(),
  violation_name: z.string().max(200).optional(),
  reason: z.string().max(1000).optional(),
  description: z.string().max(10000).optional(),
  severity: z.enum(['Minor','Moderate','Serious','N/A']).optional(),
  marks_deducted: z.number().min(0).max(100000).optional(),
  incident_date: z.string().date().optional(),
  location: z.string().max(300).optional(),
  status: z.enum(['Reported','Under Review','Confirmed','Resolved','Appealed','Closed']).optional(),
  evidence_url: z.string().max(2000).optional(),
  witnesses: z.string().max(3000).optional(),
  counselling: z.string().max(5000).optional(),
  action_taken: z.string().max(5000).optional(),
  recorded_by: z.string().max(200).optional()
});

router.patch('/:id', requireOrganizationRole, requireWriteRole, async (req, res) => {
  const incident = await loadIncident(req.params.id);
  if (!incident || incident.organization_id !== req.organizationId) {
    return res.status(404).json({ error: 'Incident not found in this organization.' });
  }
  const parsed = incidentUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid incident update.', details: parsed.error.flatten() });
  if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
  const { data, error } = await adminDb.from('incidents').update(parsed.data).eq('id', incident.id).select().single();
  if (error) return res.status(400).json({ error: 'Could not update incident.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'update', entity_type: 'incident', entity_id: data.id, details: { changes: parsed.data } });
  res.json({ data });
});

router.delete('/:id', requireOrganizationRole, requireAdminRole, async (req, res) => {
  const incident = await loadIncident(req.params.id);
  if (!incident || incident.organization_id !== req.organizationId) {
    return res.status(404).json({ error: 'Incident not found in this organization.' });
  }
  const { error } = await adminDb.from('incidents').delete().eq('id', incident.id);
  if (error) return res.status(400).json({ error: 'Could not delete incident.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'delete', entity_type: 'incident', entity_id: incident.id, details: { person_id: incident.person_id, incident_date: incident.incident_date } });
  res.status(204).end();
});
