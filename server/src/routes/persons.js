import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireOrganizationRole, requireWriteRole } from '../middleware/auth.js';

const router = Router();
const personSchema = z.object({
  organization_id: z.string().uuid(), track: z.enum(['HIGH_SCHOOL','UNIVERSITY','COMPANY','ORGANIZATION','COMMUNITY']),
  full_name: z.string().trim().min(1).max(200), person_id: z.string().trim().min(1).max(100),
  gender: z.enum(['Male','Female','Other']).optional(), date_of_birth: z.string().date().optional(),
  guardian_contact: z.string().max(200).optional(), academic_year: z.string().max(30).optional(),
  faculty: z.string().max(200).optional(), academic_department: z.string().max(200).optional(),
  program: z.string().max(200).optional(), year_of_study: z.string().max(50).optional(),
  cohort: z.string().max(100).optional(), role: z.string().max(100).optional(), date_joined: z.string().date().optional(),
  status: z.enum(['Active','Suspended','Inactive','Under Review']).optional()
});
router.get('/', requireOrganizationRole, async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '50', 10) || 50, 1), 100);
  const { data, error } = await adminDb.from('persons').select('*').eq('organization_id', req.organizationId).order('full_name').limit(limit);
  if (error) return res.status(500).json({ error: 'Could not load people.' });
  res.json({ data });
});
router.post('/', requireOrganizationRole, requireWriteRole, async (req, res) => {
  const parsed = personSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid person data.', details: parsed.error.flatten() });
  if (parsed.data.organization_id !== req.organizationId) return res.status(403).json({ error: 'Organization mismatch.' });
  const { data, error } = await adminDb.from('persons').insert({ ...parsed.data, created_by: req.user.id }).select().single();
  if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.code === '23505' ? 'This person ID already exists in the organization.' : 'Could not create person.' });
  await adminDb.from('audit_logs').insert({ organization_id: req.organizationId, actor_id: req.user.id, action: 'create', entity_type: 'person', entity_id: data.id, details: { person_id: data.person_id } });
  res.status(201).json({ data });
});
export default router;
