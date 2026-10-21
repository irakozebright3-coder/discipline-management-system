import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership, isAdmin } from '../middleware/auth.js';
import { audit, zodMessage } from '../lib.js';

const router = Router();
const schema = z.object({
  institution_id: z.string().uuid(),
  name: z.string().min(2).max(160),
  category: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  severity: z.enum(['minor', 'moderate', 'serious', 'not_applicable']).optional(),
  default_deduction: z.number().min(0).max(1000).optional(),
  active: z.boolean().optional()
});

router.get('/', requireAuth, requireMembership(), async (req, res) => {
  const { data, error } = await adminDb.from('incident_categories').select('*')
    .eq('institution_id', req.institutionId).order('name');
  if (error) return res.status(500).json({ error: 'Could not load incident categories.' });
  res.json({ data: data || [] });
});

router.post('/', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid category.') });
  const { data, error } = await adminDb.from('incident_categories').insert(parsed.data).select().single();
  if (error) return res.status(409).json({ error: 'That category already exists.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'create', 'incident_category', data.id, { name: data.name });
  res.status(201).json({ data });
});

router.patch('/:id', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const parsed = schema.partial().omit({ institution_id: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid category update.') });
  const { data, error } = await adminDb.from('incident_categories').update(parsed.data)
    .eq('id', req.params.id).eq('institution_id', req.institutionId).select().single();
  if (error) return res.status(404).json({ error: 'Category not found.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'update', 'incident_category', data.id, parsed.data);
  res.json({ data });
});

router.delete('/:id', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const { count } = await adminDb.from('incidents').select('id', { count: 'exact', head: true })
    .eq('institution_id', req.institutionId).eq('category_id', req.params.id);
  if ((count || 0) > 0) return res.status(409).json({ error: `${count} cases use this category. Deactivate it instead of deleting.` });
  const { error } = await adminDb.from('incident_categories').delete().eq('id', req.params.id).eq('institution_id', req.institutionId);
  if (error) return res.status(400).json({ error: 'Could not delete the category.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'delete', 'incident_category', req.params.id, {});
  res.json({ data: { deleted: true } });
});

export default router;
