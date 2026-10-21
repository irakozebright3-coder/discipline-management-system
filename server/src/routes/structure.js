import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireOrganizationRole, requireWriteRole, requireAdminRole } from '../middleware/auth.js';

const router = Router();
const NODE_TYPES = ['trade','class','department','office','faculty','academic_department','program','cohort','year_of_study','role'];
const nodeSchema = z.object({
  organization_id: z.string().uuid(),
  node_type: z.enum(NODE_TYPES),
  name: z.string().trim().min(1).max(200),
  parent_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional()
});

router.get('/', requireOrganizationRole, async (req, res) => {
  const { data, error } = await adminDb.from('structure_nodes')
    .select('*').eq('organization_id', req.organizationId).order('node_type').order('name');
  if (error) return res.status(500).json({ error: 'Could not load organization structure.' });
  res.json({ data });
});

router.post('/', requireOrganizationRole, requireWriteRole, async (req, res) => {
  const parsed = nodeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid structure node.', details: parsed.error.flatten() });
  if (parsed.data.organization_id !== req.organizationId) return res.status(403).json({ error: 'Organization mismatch.' });
  const { data, error } = await adminDb.from('structure_nodes')
    .insert({ ...parsed.data, created_by: req.user.id }).select().single();
  if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.code === '23505' ? 'This node already exists.' : 'Could not create structure node.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'create', entity_type: 'structure_node', entity_id: data.id, details: { node_type: data.node_type, name: data.name } });
  res.status(201).json({ data });
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const nodeUpdateSchema = nodeSchema.partial().omit({ organization_id: true, node_type: true });

router.patch('/:id', requireOrganizationRole, requireWriteRole, async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Structure node not found.' });
  const parsed = nodeUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid node update.', details: parsed.error.flatten() });
  if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
  const { data, error } = await adminDb.from('structure_nodes').update(parsed.data).eq('id', req.params.id).eq('organization_id', req.organizationId).select().single();
  if (error || !data) return res.status(404).json({ error: 'Structure node not found.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'update', entity_type: 'structure_node', entity_id: data.id, details: { changes: parsed.data } });
  res.json({ data });
});

router.delete('/:id', requireOrganizationRole, requireAdminRole, async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Structure node not found.' });
  const { error } = await adminDb.from('structure_nodes').delete().eq('id', req.params.id).eq('organization_id', req.organizationId);
  if (error) return res.status(400).json({ error: 'Could not delete structure node.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'delete', entity_type: 'structure_node', entity_id: req.params.id, details: {} });
  res.status(204).end();
});

export default router;
