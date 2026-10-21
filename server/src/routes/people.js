import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership, canWrite, isAdmin, isReadOnly } from '../middleware/auth.js';
import { audit, zodMessage } from '../lib.js';

const router = Router();
const UNITS = ['class', 'stream', 'trade', 'department', 'program', 'cohort', 'branch', 'office', 'position'];

const personSchema = z.object({
  institution_id: z.string().uuid(),
  person_id: z.string().min(1).max(60),
  full_name: z.string().min(2).max(200),
  person_type: z.enum(['student', 'staff', 'member', 'worker', 'officer', 'partner', 'other']).optional(),
  gender: z.string().max(40).optional().nullable(),
  date_of_birth: z.string().max(30).optional().nullable(),
  status: z.enum(['active', 'suspended', 'inactive', 'under_review', 'archived']).optional(),
  class_unit_id: z.string().uuid().optional().nullable(),
  trade_unit_id: z.string().uuid().optional().nullable(),
  department_unit_id: z.string().uuid().optional().nullable(),
  program_unit_id: z.string().uuid().optional().nullable(),
  cohort_unit_id: z.string().uuid().optional().nullable(),
  academic_year: z.string().max(20).optional().nullable(),
  guardian_name: z.string().max(200).optional().nullable(),
  guardian_phone: z.string().max(40).optional().nullable(),
  guardian_contact: z.string().max(200).optional().nullable(),
  metadata: z.record(z.any()).optional()
});

const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

function sanitizePerson(d) {
  const out = { ...d };
  for (const k of Object.keys(out)) if (out[k] === '') out[k] = null;
  if (out.guardian_phone && !PHONE_RE.test(out.guardian_phone)) {
    return { error: 'Guardian phone must be a valid international number, e.g. +2507…' };
  }
  return { data: out };
}

// Paginated, filterable register.
router.get('/', requireAuth, requireMembership(), async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '25', 10) || 25, 1), 100);
  let query = adminDb.from('people').select('*', { count: 'exact' }).eq('institution_id', req.institutionId);
  if (req.query.status) query = query.eq('status', req.query.status);
  if (req.query.person_type) query = query.eq('person_type', req.query.person_type);
  if (req.query.unit_id) query = query.or(`class_unit_id.eq.${req.query.unit_id},department_unit_id.eq.${req.query.unit_id},program_unit_id.eq.${req.query.unit_id},cohort_unit_id.eq.${req.query.unit_id}`);
  if (req.query.search) {
    const s = String(req.query.search).replace(/[%,]/g, '');
    query = query.or(`full_name.ilike.%${s}%,person_id.ilike.%${s}%`);
  }
  const sortField = ['full_name', 'created_at', 'person_id', 'status'].includes(req.query.sort) ? req.query.sort : 'full_name';
  const ascending = req.query.order !== 'desc';
  const { data, error, count } = await query.order(sortField, { ascending }).range((page - 1) * limit, page * limit - 1);
  if (error) return res.status(500).json({ error: 'Could not load people.' });
  res.json({ data: data || [], page, limit, total: count || 0, has_more: (page * limit) < (count || 0) });
});

router.post('/', requireAuth, requireMembership(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot add people.' });
  const parsed = personSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid person details.') });
  const { data: clean, error: cleanErr } = sanitizePerson(parsed.data);
  if (cleanErr) return res.status(400).json({ error: cleanErr });
  if (clean.institution_id !== req.institutionId) return res.status(403).json({ error: 'Institution mismatch.' });
  const { data: dupe } = await adminDb.from('people').select('id')
    .eq('institution_id', req.institutionId).eq('person_id', clean.person_id).maybeSingle();
  if (dupe) return res.status(409).json({ error: `Person ID ${clean.person_id} already exists in this institution.` });
  const { data, error } = await adminDb.from('people').insert({ ...clean, created_by: req.user.id }).select().single();
  if (error) return res.status(400).json({ error: 'Could not save the person.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'create', 'person', data.id, { person_id: data.person_id, name: data.full_name });
  res.status(201).json({ data });
});

router.get('/:id', requireAuth, requireMembership(), async (req, res) => {
  const { data: person } = await adminDb.from('people').select('*').eq('id', req.params.id).eq('institution_id', req.institutionId).maybeSingle();
  if (!person) return res.status(404).json({ error: 'Person not found in this institution.' });
  const [enrollments, incidents] = await Promise.all([
    adminDb.from('person_enrollments').select('id, unit_id, status, org_units(name, unit_type)').eq('person_id', person.id),
    adminDb.from('incidents').select('id, case_number, category_name, incident_date, status, severity').eq('person_id', person.id).order('incident_date', { ascending: false })
  ]);
  res.json({ data: { ...person, enrollments: enrollments.data || [], incidents: incidents.data || [] } });
});

router.patch('/:id', requireAuth, requireMembership(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot edit people.' });
  const schema = personSchema.partial().omit({ institution_id: true }).extend({
    status: z.enum(['active', 'suspended', 'inactive', 'under_review', 'archived']).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid person details.') });
  const { data: existing } = await adminDb.from('people').select('id, person_id').eq('id', req.params.id).eq('institution_id', req.institutionId).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Person not found in this institution.' });
  const { data: clean, error: cleanErr } = sanitizePerson(parsed.data);
  if (cleanErr) return res.status(400).json({ error: cleanErr });
  const changed = { ...clean };
  // person_id is the human identifier; only admins may change it and it must stay unique
  if (changed.person_id && changed.person_id !== existing.person_id) {
    if (!isAdmin(req.role)) { delete changed.person_id; }
    else {
      const { data: dupe } = await adminDb.from('people').select('id')
        .eq('institution_id', req.institutionId).eq('person_id', changed.person_id).neq('id', existing.id).maybeSingle();
      if (dupe) return res.status(409).json({ error: `Person ID ${changed.person_id} already exists.` });
    }
  }
  const { data, error } = await adminDb.from('people').update(changed).eq('id', existing.id).select().single();
  if (error) return res.status(400).json({ error: 'Could not save changes.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'update', 'person', data.id, { fields: Object.keys(changed) });
  res.json({ data });
});

// Archive / restore (no destructive delete of history).
router.post('/:id/archive', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const { data, error } = await adminDb.from('people').update({ status: 'archived' })
    .eq('id', req.params.id).eq('institution_id', req.institutionId).select().single();
  if (error) return res.status(404).json({ error: 'Person not found in this institution.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'archive', 'person', data.id, {});
  res.json({ data });
});

router.post('/:id/restore', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const { data, error } = await adminDb.from('people').update({ status: 'active' })
    .eq('id', req.params.id).eq('institution_id', req.institutionId).select().single();
  if (error) return res.status(404).json({ error: 'Person not found in this institution.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'restore', 'person', data.id, {});
  res.json({ data });
});

// Profile photo (optional). Base64 upload to the private bucket; signed URL returned.
router.post('/:id/photo', requireAuth, requireMembership(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot change photos.' });
  const { file_name, mime_type, data_base64 } = req.body || {};
  if (!data_base64) return res.status(400).json({ error: 'A file is required.' });
  if (!/^image\/(png|jpe?g|webp)$/.test(mime_type || '')) return res.status(400).json({ error: 'Only PNG, JPEG or WebP images are allowed.' });
  const buffer = Buffer.from(String(data_base64).replace(/^data:[^,]+,/, ''), 'base64');
  if (buffer.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'Images must be 4 MB or smaller.' });
  const { data: person } = await adminDb.from('people').select('id').eq('id', req.params.id).eq('institution_id', req.institutionId).maybeSingle();
  if (!person) return res.status(404).json({ error: 'Person not found in this institution.' });
  const path = `photos/${req.institutionId}/${person.id}/${Date.now()}-${(file_name || 'photo').replace(/[^\w.\-]/g, '_')}`;
  const { error: upErr } = await adminDb.storage.from('dm-files').upload(path, buffer, { contentType: mime_type, upsert: true });
  if (upErr) return res.status(400).json({ error: 'Could not store the photo.' });
  const { data: signed } = await adminDb.storage.from('dm-files').createSignedUrl(path, 60 * 60 * 24 * 365);
  const { data, error } = await adminDb.from('people').update({ photo_url: signed?.signedUrl || null }).eq('id', person.id).select().single();
  if (error) return res.status(400).json({ error: 'Could not attach the photo.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'photo.update', 'person', person.id, { path });
  res.json({ data });
});

export default router;
