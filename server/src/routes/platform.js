import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth, requirePlatformOwner } from '../middleware/auth.js';
import { audit, zodMessage, listUserDirectory } from '../lib.js';

const router = Router();
router.use(requireAuth, requirePlatformOwner);

router.get('/whoami', (req, res) => res.json({ data: { owner: true } }));

router.get('/dashboard', async (req, res) => {
  const [inst, activeInst, users, people, incidents, supports] = await Promise.all([
    adminDb.from('institutions').select('id', { count: 'exact', head: true }),
    adminDb.from('institutions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    adminDb.from('profiles').select('id', { count: 'exact', head: true }),
    adminDb.from('people').select('id', { count: 'exact', head: true }),
    adminDb.from('incidents').select('id', { count: 'exact', head: true }),
    adminDb.from('support_requests').select('id', { count: 'exact', head: true }).eq('status', 'open')
  ]);
  const { data: recent } = await adminDb.from('institutions').select('id, name, type, track, status, created_at').order('created_at', { ascending: false }).limit(10);
  const { data: settings } = await adminDb.from('platform_settings').select('app_settings').eq('id', 1).maybeSingle();
  const app = settings?.app_settings || {};
  res.json({
    data: {
      counts: {
        institutions: inst.count || 0, active_institutions: activeInst.count || 0,
        users: users.count || 0, people: people.count || 0,
        incidents: incidents.count || 0, open_support: supports.count || 0
      },
      institutions: recent || [],
      config: { system_version: app.system_version || '1.0.0', maintenance_mode: !!app.maintenance_mode, system_health: app.system_health || 'Healthy', visitors: app.visitors || 0 }
    }
  });
});

router.get('/institutions', async (req, res) => {
  // status and type are enum columns, which PostgREST cannot ilike, so the
  // search runs over the fetched rows here instead of in the database.
  const { data, error } = await adminDb.from('institutions').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Could not load institutions.' });
  let rows = data || [];
  const needle = String(req.query.search || '').replace(/[%,]/g, '').trim().toLowerCase();
  if (needle) {
    rows = rows.filter(i => [i.name, i.track, i.status, i.type]
      .some(v => String(v || '').toLowerCase().includes(needle)));
  }
  const { data: memberCounts } = await adminDb.from('institution_memberships').select('institution_id').eq('status', 'active');
  const counts = {};
  for (const m of memberCounts || []) counts[m.institution_id] = (counts[m.institution_id] || 0) + 1;
  res.json({ data: rows.map(i => ({ ...i, member_count: counts[i.id] || 0 })) });
});

const instPatch = z.object({ status: z.enum(['active', 'suspended', 'archived']).optional(), name: z.string().min(2).max(200).optional() });

router.patch('/institutions/:id', async (req, res) => {
  const parsed = instPatch.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid update.' });
  const { data, error } = await adminDb.from('institutions').update(parsed.data).eq('id', req.params.id).select().single();
  if (error) return res.status(404).json({ error: 'Institution not found.' });
  await adminDb.from('platform_audit_logs').insert({
    action: parsed.data.status ? `institution.${parsed.data.status}` : 'institution.update',
    target: data.name, details: JSON.stringify(parsed.data), user_name: req.user.email, actor_id: req.user.id, result: 'Success'
  });
  res.json({ data });
});

router.get('/users', async (req, res) => {
  const directory = await listUserDirectory(10);
  const needle = String(req.query.search || '').trim().toLowerCase();
  const matching = needle
    ? Object.values(directory.byId).filter(u =>
        (u.email || '').toLowerCase().includes(needle) || (u.full_name || '').toLowerCase().includes(needle))
    : null;
  const { data: memberships } = await adminDb.from('institution_memberships').select('user_id, role, status, institution_id');
  const byUser = {};
  for (const m of memberships || []) (byUser[m.user_id] = byUser[m.user_id] || []).push(m);
  const { data: settings } = await adminDb.from('platform_settings').select('app_settings').eq('id', 1).maybeSingle();
  const owners = new Set(settings?.app_settings?.owner_ids || []);
  res.json({
    data: (matching || Object.values(directory.byId)).map(u => ({
      id: u.id, email: u.email, full_name: u.full_name, created_at: u.created_at,
      is_owner: owners.has(u.id), memberships: (byUser[u.id] || []).length
    })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  });
});

router.get('/audit-logs', async (req, res) => {
  let query = adminDb.from('platform_audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (req.query.search) {
    const s = String(req.query.search).replace(/[%,]/g, '');
    query = query.or(`action.ilike.%${s}%,target.ilike.%${s}%,user_name.ilike.%${s}%`);
  }
  const { data } = await query;
  res.json({ data: data || [] });
});

router.get('/org-audit-logs', async (req, res) => {
  let query = adminDb.from('audit_logs').select('*, institutions(name)').order('created_at', { ascending: false }).limit(200);
  const s = String(req.query.search || '').replace(/[%,]/g, '').trim();
  if (s) {
    // Embedded-resource filters are not supported inside .or(); resolve
    // matching institutions first and filter audit rows by institution_id.
    const { data: insts } = await adminDb.from('institutions').select('id').or(`name.ilike.%${s}%`);
    const conditions = [`action.ilike.%${s}%`, `actor_name.ilike.%${s}%`];
    if (insts?.length) conditions.push(`institution_id.in.(${insts.map(i => `"${i.id}"`).join(',')})`);
    query = query.or(conditions.join(','));
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Could not load the audit log.' });
  res.json({ data: data || [] });
});

router.get('/settings', async (_req, res) => {
  const { data } = await adminDb.from('platform_settings').select('*').eq('id', 1).maybeSingle();
  const a = data?.app_settings || {};
  res.json({ data: {
    system_version: a.system_version || '1.0.0', maintenance_mode: !!a.maintenance_mode,
    system_health: a.system_health || 'Healthy', contact_email: a.contact_email || null,
    support_email: a.support_email || null, about: a.about || null,
    footer_text: a.footer_text || null, copyright: a.copyright || null, visitors: a.visitors || 0
  } });
});

router.patch('/settings', async (req, res) => {
  const schema = z.object({
    system_version: z.string().max(20).optional(), maintenance_mode: z.boolean().optional(),
    system_health: z.string().max(40).optional(), contact_email: z.string().email().nullable().optional(),
    support_email: z.string().email().nullable().optional(), about: z.string().max(20000).nullable().optional(),
    footer_text: z.string().max(500).nullable().optional(), copyright: z.string().max(300).nullable().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid settings.') });
  const { data: current } = await adminDb.from('platform_settings').select('app_settings').eq('id', 1).maybeSingle();
  const merged = { ...(current?.app_settings || {}), ...parsed.data };
  const { error } = await adminDb.from('platform_settings').update({ app_settings: merged }).eq('id', 1);
  if (error) return res.status(400).json({ error: 'Could not save platform settings.' });
  await adminDb.from('platform_audit_logs').insert({ action: 'settings.update', target: 'platform', details: JSON.stringify(parsed.data), user_name: req.user.email, actor_id: req.user.id, result: 'Success' });
  res.json({ data: parsed.data });
});

// Owner profile (creator_profiles row 1) — displayed publicly as IRAKOZE Bright unless changed by the owner.
router.get('/owner-profile', async (_req, res) => {
  const { data } = await adminDb.from('creator_profiles').select('*').limit(1).maybeSingle();
  res.json({ data: data || null });
});

router.put('/owner-profile', async (req, res) => {
  const schema = z.object({
    full_name: z.string().min(2).max(200), title: z.string().max(200).nullable().optional(),
    biography: z.string().max(5000).nullable().optional(), photo_url: z.string().max(2000).nullable().optional(),
    social_links: z.record(z.any()).nullable().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid profile.') });
  const { data: existing } = await adminDb.from('creator_profiles').select('id').limit(1).maybeSingle();
  let data, error;
  if (existing) ({ data, error } = await adminDb.from('creator_profiles').update(parsed.data).eq('id', existing.id).select().single());
  else ({ data, error } = await adminDb.from('creator_profiles').insert(parsed.data).select().single());
  if (error) return res.status(400).json({ error: 'Could not save the owner profile.' });
  await adminDb.from('platform_audit_logs').insert({ action: 'owner_profile.update', target: 'platform', details: '', user_name: req.user.email, actor_id: req.user.id, result: 'Success' });
  res.json({ data });
});

// Help articles + FAQs + contributors + support requests.
const articleSchema = z.object({ category: z.string().max(80), title: z.string().min(3).max(200), content: z.string().min(3).max(20000), order_index: z.number().int().optional() });

router.get('/help-articles', async (_req, res) => {
  const { data } = await adminDb.from('help_articles').select('*').order('order_index').order('created_at');
  res.json({ data: data || [] });
});
router.post('/help-articles', async (req, res) => {
  const parsed = articleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid article.') });
  const { data, error } = await adminDb.from('help_articles').insert(parsed.data).select().single();
  if (error) return res.status(400).json({ error: 'Could not save the article.' });
  res.status(201).json({ data });
});
router.delete('/help-articles/:id', async (req, res) => {
  await adminDb.from('help_articles').delete().eq('id', req.params.id);
  res.json({ data: { deleted: true } });
});

router.get('/support-requests', async (_req, res) => {
  const { data } = await adminDb.from('support_requests').select('*').order('created_at', { ascending: false }).limit(200);
  res.json({ data: data || [] });
});
router.patch('/support-requests/:id', async (req, res) => {
  const status = ['open', 'in_progress', 'resolved', 'closed'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: 'Invalid status.' });
  const { data, error } = await adminDb.from('support_requests').update({ status }).eq('id', req.params.id).select().single();
  if (error) return res.status(404).json({ error: 'Request not found.' });
  res.json({ data });
});

router.get('/system-health', async (_req, res) => {
  const t0 = Date.now();
  const { error } = await adminDb.from('platform_settings').select('id').eq('id', 1).limit(1).maybeSingle();
  const latency = Date.now() - t0;
  const { data: settings } = await adminDb.from('platform_settings').select('app_settings').eq('id', 1).maybeSingle();
  const [inst, people, inc, users] = await Promise.all([
    adminDb.from('institutions').select('id', { count: 'exact', head: true }),
    adminDb.from('people').select('id', { count: 'exact', head: true }),
    adminDb.from('incidents').select('id', { count: 'exact', head: true }),
    adminDb.from('profiles').select('id', { count: 'exact', head: true })
  ]);
  res.json({ data: {
    database: error ? 'Unreachable' : 'Connected', latency_ms: latency,
    maintenance_mode: !!settings?.app_settings?.maintenance_mode,
    system_version: settings?.app_settings?.system_version || '1.0.0',
    counts: { institutions: inst.count || 0, people: people.count || 0, incidents: inc.count || 0, users: users.count || 0 }
  } });
});

export default router;
