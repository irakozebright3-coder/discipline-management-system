import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireOrganizationRole, requireAdminRole } from '../middleware/auth.js';

const router = Router();

const violationSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  track: z.enum(['HIGH_SCHOOL','UNIVERSITY','COMPANY','ORGANIZATION','COMMUNITY']).optional(),
  description: z.string().trim().max(2000).optional(),
  severity: z.enum(['Minor', 'Moderate', 'Serious', 'N/A']).optional(),
  default_marks_deducted: z.number().min(0).max(100000).optional(),
  active: z.boolean().optional()
});

const violationUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  severity: z.enum(['Minor', 'Moderate', 'Serious', 'N/A']).optional(),
  default_marks_deducted: z.number().min(0).max(100000).optional(),
  active: z.boolean().optional()
});

async function loadViolation(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data } = await adminDb.from('violations').select('*').eq('id', id).maybeSingle();
  return data || null;
}

router.get('/', requireOrganizationRole, async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '100', 10) || 100, 1), 200);
  const { data, error } = await adminDb.from('violations')
    .select('*').eq('organization_id', req.organizationId).order('name').limit(limit);
  if (error) return res.status(500).json({ error: 'Could not load violations.' });
  res.json({ data });
});

router.get('/:id', requireOrganizationRole, async (req, res) => {
  const violation = await loadViolation(req.params.id);
  if (!violation || violation.organization_id !== req.organizationId) {
    return res.status(404).json({ error: 'Violation not found in this organization.' });
  }
  res.json({ data: violation });
});

router.post('/', requireOrganizationRole, requireAdminRole, async (req, res) => {
  const parsed = violationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid violation data.', details: parsed.error.flatten() });
  if (parsed.data.organization_id !== req.organizationId) return res.status(403).json({ error: 'Organization mismatch.' });
  const { data, error } = await adminDb.from('violations')
    .insert({ ...parsed.data, created_by: req.user.id }).select().single();
  if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.code === '23505' ? 'This violation name already exists in the organization.' : 'Could not create violation.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'create', entity_type: 'violation', entity_id: data.id, details: { name: data.name } });
  res.status(201).json({ data });
});

router.patch('/:id', requireOrganizationRole, requireAdminRole, async (req, res) => {
  const existing = await loadViolation(req.params.id);
  if (!existing || existing.organization_id !== req.organizationId) {
    return res.status(404).json({ error: 'Violation not found in this organization.' });
  }
  const parsed = violationUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid violation update.', details: parsed.error.flatten() });
  if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
  const { data, error } = await adminDb.from('violations').update(parsed.data).eq('id', existing.id).select().single();
  if (error) return res.status(400).json({ error: 'Could not update violation.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'update', entity_type: 'violation', entity_id: data.id, details: { changes: parsed.data } });
  res.json({ data });
});

router.delete('/:id', requireOrganizationRole, requireAdminRole, async (req, res) => {
  const existing = await loadViolation(req.params.id);
  if (!existing || existing.organization_id !== req.organizationId) {
    return res.status(404).json({ error: 'Violation not found in this organization.' });
  }
  const { error } = await adminDb.from('violations').delete().eq('id', existing.id);
  if (error) return res.status(400).json({ error: 'Could not delete violation. Remove incidents referencing it first.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'delete', entity_type: 'violation', entity_id: existing.id, details: { name: existing.name } });
  res.status(204).end();
});

export default router;
