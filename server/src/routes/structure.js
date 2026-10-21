import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership, canWrite, isAdmin, isReadOnly } from '../middleware/auth.js';
import { audit, zodMessage } from '../lib.js';

const router = Router();
const UNIT_TYPES = ['academic_year', 'term', 'class', 'stream', 'trade', 'subject', 'department', 'program', 'cohort', 'branch', 'office', 'position'];

router.get('/', requireAuth, requireMembership(), async (req, res) => {
  let query = adminDb.from('org_units').select('*').eq('institution_id', req.institutionId);
  if (req.query.unit_type) query = query.eq('unit_type', req.query.unit_type);
  const { data, error } = await query.order('unit_type').order('name');
  if (error) return res.status(500).json({ error: 'Could not load the structure.' });
  res.json({ data: data || [] });
});

const unitSchema = z.object({
  institution_id: z.string().uuid(),
  unit_type: z.enum(UNIT_TYPES),
  name: z.string().min(1).max(120),
  parent_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.any()).optional()
});

router.post('/', requireAuth, requireMembership(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot change the structure.' });
  const parsed = unitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid structure entry.') });
  const { data, error } = await adminDb.from('org_units').insert(parsed.data).select().single();
  if (error) return res.status(409).json({ error: 'That entry already exists in this institution.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'create', 'org_unit', data.id, { unit_type: data.unit_type, name: data.name });
  res.status(201).json({ data });
});

router.patch('/:id', requireAuth, requireMembership(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot change the structure.' });
  const parsed = z.object({ name: z.string().min(1).max(120).optional(), parent_id: z.string().uuid().nullable().optional(), metadata: z.record(z.any()).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid update.' });
  const { data, error } = await adminDb.from('org_units').update(parsed.data)
    .eq('id', req.params.id).eq('institution_id', req.institutionId).select().single();
  if (error) return res.status(404).json({ error: 'Structure entry not found.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'update', 'org_unit', data.id, parsed.data);
  res.json({ data });
});

router.delete('/:id', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const { data: unit } = await adminDb.from('org_units').select('id, name').eq('id', req.params.id).eq('institution_id', req.institutionId).maybeSingle();
  if (!unit) return res.status(404).json({ error: 'Structure entry not found.' });
  const { count } = await adminDb.from('people').select('id', { count: 'exact', head: true })
    .eq('institution_id', req.institutionId)
    .or(`class_unit_id.eq.${unit.id},trade_unit_id.eq.${unit.id},department_unit_id.eq.${unit.id},program_unit_id.eq.${unit.id},cohort_unit_id.eq.${unit.id}`);
  if ((count || 0) > 0) return res.status(409).json({ error: `${count} people are still assigned to ${unit.name}. Reassign them first.` });
  await adminDb.from('org_units').delete().eq('id', unit.id);
  await audit(req.institutionId, req.user.id, req.user.full_name, 'delete', 'org_unit', unit.id, { name: unit.name });
  res.json({ data: { deleted: true } });
});

export default router;
