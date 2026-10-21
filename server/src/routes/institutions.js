import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership, isAdmin, isPlatformOwner } from '../middleware/auth.js';
import { audit, platformAudit, zodMessage } from '../lib.js';
import { DEFAULT_CATEGORIES } from '../default_categories.js';

const router = Router();
const TRACKS = ['HIGH_SCHOOL', 'UNIVERSITY', 'COMPANY', 'ORGANIZATION', 'COMMUNITY'];

const newInstitutionSchema = z.object({
  name: z.string().min(2).max(200),
  track: z.enum(TRACKS),
  timezone: z.string().max(64).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(400).optional()
});

// List institutions the caller can access.
router.get('/', requireAuth, async (req, res) => {
  const owner = await isPlatformOwner(req.user.id);
  let query = adminDb.from('institutions').select('*, institution_memberships!inner(user_id, role, status)');
  if (!owner) query = query.eq('institution_memberships.user_id', req.user.id).eq('institution_memberships.status', 'active');
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: 'Could not load your institutions.' });
  const rows = (data || []).map(i => {
    const m = (i.institution_memberships || []).find(x => x.user_id === req.user.id);
    return {
      institution: (({ institution_memberships, ...rest }) => rest)(i),
      role: m ? m.role : 'platform_owner',
      status: m ? m.status : 'active'
    };
  });
  res.json({ data: rows });
});

// Create an institution — the creator becomes its institution admin.
router.post('/', requireAuth, async (req, res) => {
  const parsed = newInstitutionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid institution details.') });
  const d = parsed.data;
  const { data: inst, error } = await adminDb.from('institutions').insert({
    name: d.name.trim(), type: d.track, track: d.track, timezone: d.timezone || 'Africa/Kigali',
    email: d.email || null, phone: d.phone || null, address: d.address || null, created_by: req.user.id
  }).select().single();
  if (error) return res.status(400).json({ error: 'Could not create the institution. It may already exist.' });

  try {
    await adminDb.from('institution_memberships').insert({ institution_id: inst.id, user_id: req.user.id, role: 'institution_admin', status: 'active' });
    await adminDb.from('scoring_rules').insert({ institution_id: inst.id, name: 'Default', starting_marks: 40, term_count: 3, max_annual: 120 });
    await adminDb.from('institution_settings').insert({ institution_id: inst.id });
    const cats = (DEFAULT_CATEGORIES[d.track] || []).map(([name, severity, deduction]) => ({
      institution_id: inst.id, name, severity, default_deduction: deduction, category: 'General'
    }));
    if (cats.length) await adminDb.from('incident_categories').insert(cats);
    await adminDb.from('platform_audit_logs').insert({ action: 'institution.create', target: inst.name, details: `Track: ${d.track}`, user_name: req.user.email, actor_id: req.user.id, result: 'Success' });
    await audit(inst.id, req.user.id, req.user.full_name, 'create', 'institution', inst.id, { name: inst.name });
  } catch (e) {
    console.error('institution bootstrap failed:', e.message);
    return res.status(500).json({ error: 'The institution was created but setup did not finish. Contact support.' });
  }
  res.status(201).json({ data: inst });
});

router.get('/:institutionId', requireAuth, requireMembership(), async (req, res) => {
  const { data, error } = await adminDb.from('institutions').select('*').eq('id', req.institutionId).single();
  if (error || !data) return res.status(404).json({ error: 'Institution not found.' });
  res.json({ data, role: req.role });
});

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  logo_url: z.string().max(2000).optional().nullable(),
  timezone: z.string().max(64).optional(),
  status: z.enum(['active', 'suspended', 'archived']).optional()
});

router.patch('/:institutionId', requireAuth, requireMembership(), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid institution details.') });
  const d = parsed.data;
  // Status changes are a platform-owner power; profile edits need an institution admin.
  if (d.status !== undefined && req.role !== 'platform_owner') {
    return res.status(403).json({ error: 'Only the platform owner can change institution status.' });
  }
  if (d.status === undefined && !isAdmin(req.role)) {
    return res.status(403).json({ error: 'Only institution admins can edit institution details.' });
  }
  const { data, error } = await adminDb.from('institutions').update(d).eq('id', req.institutionId).select().single();
  if (error) return res.status(400).json({ error: 'Could not save institution details.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'update', 'institution', req.institutionId, d);
  res.json({ data });
});

// Settings + scoring rules.
router.get('/:institutionId/settings', requireAuth, requireMembership(), async (req, res) => {
  const [settings, rules] = await Promise.all([
    adminDb.from('institution_settings').select('settings').eq('institution_id', req.institutionId).maybeSingle(),
    adminDb.from('scoring_rules').select('*').eq('institution_id', req.institutionId).eq('active', true)
  ]);
  res.json({ data: { settings: settings.data?.settings || {}, rules: rules.data || [] } });
});

const settingsSchema = z.object({
  settings: z.record(z.any()).optional(),
  starting_marks: z.number().positive().max(1000).optional(),
  term_count: z.number().int().min(1).max(3).optional(),
  max_annual: z.number().positive().max(3000).optional(),
  allow_negative: z.boolean().optional()
});

router.patch('/:institutionId/settings', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid settings.') });
  const d = parsed.data;
  if (d.settings !== undefined) {
    const { error } = await adminDb.from('institution_settings').upsert({ institution_id: req.institutionId, settings: d.settings });
    if (error) return res.status(400).json({ error: 'Could not save settings.' });
  }
  if (d.starting_marks !== undefined || d.term_count !== undefined || d.max_annual !== undefined || d.allow_negative !== undefined) {
    const patch = {};
    if (d.starting_marks !== undefined) patch.starting_marks = d.starting_marks;
    if (d.term_count !== undefined) patch.term_count = d.term_count;
    if (d.max_annual !== undefined) patch.max_annual = d.max_annual;
    if (d.allow_negative !== undefined) patch.allow_negative = d.allow_negative;
    const { error } = await adminDb.from('scoring_rules').update(patch)
      .eq('institution_id', req.institutionId).eq('active', true);
    if (error) return res.status(400).json({ error: 'Could not save scoring rules.' });
    await audit(req.institutionId, req.user.id, req.user.full_name, 'update', 'scoring_rules', req.institutionId, patch);
  }
  await audit(req.institutionId, req.user.id, req.user.full_name, 'update', 'settings', req.institutionId, { keys: Object.keys(d) });
  res.json({ data: { saved: true } });
});

export default router;
