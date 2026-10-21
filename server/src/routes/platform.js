import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

// Platform-owner console. Ownership is real: the caller must be the configured
// platform owner (platform_config.app_settings.owner_ids) or hold a
// 'platform_owner' membership in any organization.
const router = Router();

// Ownership resolution, in priority order:
//  1. PLATFORM_OWNER_EMAILS env var (comma-separated) — explicit deployment config.
//  2. platform_config.app_settings.owner_ids — owners claimed in the database.
//  3. a 'platform_owner' membership in any organization.
//  4. first-user bootstrap: on a fresh install with no owner configured anywhere,
//     the first authenticated caller claims ownership (recorded in app_settings).
async function isPlatformOwner(userId, email) {
  const envOwners = (process.env.PLATFORM_OWNER_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (envOwners.length && email && envOwners.includes(email.toLowerCase())) return true;

  const { data: config } = await adminDb.from('platform_config').select('id, app_settings').limit(1).maybeSingle();
  const settings = config?.app_settings || {};
  const ownerIds = settings.owner_ids || [];
  if (ownerIds.includes(userId)) return true;

  const { data: membership } = await adminDb.from('organization_members')
    .select('role').eq('user_id', userId).eq('role', 'platform_owner').limit(1).maybeSingle();
  if (membership) return true;

  if (!envOwners.length && ownerIds.length === 0 && config) {
    await adminDb.from('platform_config')
      .update({ app_settings: { ...settings, owner_ids: [userId] }, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    await adminDb.from('platform_audit_logs').insert({
      action: 'owner.bootstrap', target: 'platform_config',
      details: 'First user claimed platform ownership on a fresh install.',
      user_name: email || userId, actor_id: userId, result: 'Success'
    });
    return true;
  }
  return false;
}

async function requirePlatformOwner(req, res, next) {
  if (!(await isPlatformOwner(req.user.id, req.user.email))) {
    return res.status(403).json({ error: 'Platform owner access required.' });
  }
  next();
}
router.use(requireAuth, requirePlatformOwner);

async function platformLog(action, target, user, details = '') {
  await adminDb.from('platform_audit_logs').insert({
    action, target, details, user_name: user.email || user.id,
    actor_id: user.id, result: 'Success'
  });
}

router.get('/whoami', (req, res) => res.json({ data: { owner: true } }));

router.get('/dashboard', async (req, res) => {
  const [orgs, people, incidents, users, visits] = await Promise.all([
    adminDb.from('organizations').select('*', { count: 'exact' }),
    adminDb.from('persons').select('id', { count: 'exact', head: true }),
    adminDb.from('incidents').select('id', { count: 'exact', head: true }),
    adminDb.from('profiles').select('id', { count: 'exact', head: true }),
    adminDb.from('platform_config').select('*').limit(1).maybeSingle()
  ]);
  res.json({ data: {
    organizations: orgs.data || [],
    counts: {
      organizations: orgs.count || 0, people: people.count || 0,
      incidents: incidents.count || 0, users: users.count || 0,
      visitors: Number(visits?.visitor_count || 0)
    },
    config: visits || null
  }});
});

router.get('/users', async (_req, res) => {
  const { data, error } = await adminDb.from('profiles').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(200);
  if (error) return res.status(500).json({ error: 'Could not load users.' });
  res.json({ data });
});

router.get('/audit-logs', async (_req, res) => {
  const { data, error } = await adminDb.from('platform_audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return res.status(500).json({ error: 'Could not load audit logs.' });
  res.json({ data });
});

router.get('/org-audit-logs', async (_req, res) => {
  const { data, error } = await adminDb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return res.status(500).json({ error: 'Could not load audit logs.' });
  res.json({ data });
});

const backupSchema = z.object({
  name: z.string().trim().min(1).max(200),
  status: z.enum(['Completed','Running','Failed']).default('Completed'),
  size: z.string().max(50).default(''),
  details: z.string().max(500).default('')
});
router.post('/backups', async (req, res) => {
  const parsed = backupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid backup record.', details: parsed.error.flatten() });
  const { data, error } = await adminDb.from('platform_backups')
    .insert({ ...parsed.data, created_by_name: req.user.email || 'platform owner' }).select().single();
  if (error) return res.status(400).json({ error: 'Could not create backup record.' });
  await platformLog('backup.create', data.name, req.user, data.status);
  res.status(201).json({ data });
});
router.get('/backups', async (_req, res) => {
  const { data, error } = await adminDb.from('platform_backups').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) return res.status(500).json({ error: 'Could not load backups.' });
  res.json({ data });
});
router.delete('/backups/:id', async (req, res) => {
  const { error } = await adminDb.from('platform_backups').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: 'Could not delete backup record.' });
  await platformLog('backup.delete', req.params.id, req.user);
  res.status(204).end();
});

const configSchema = z.object({
  maintenance_mode: z.boolean().optional(),
  system_health: z.string().max(50).optional(),
  system_version: z.string().max(20).optional()
});
router.get('/config', async (_req, res) => {
  const { data, error } = await adminDb.from('platform_config').select('*').limit(1).maybeSingle();
  if (error) return res.status(400).json({ error: 'Could not load platform configuration.' });
  res.json({ data });
});

router.get('/contributors', async (_req, res) => {
  const { data, error } = await adminDb.from('contributors').select('*').order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: 'Could not load contributors.' });
  res.json({ data });
});

router.get('/help-articles', async (_req, res) => {
  const { data, error } = await adminDb.from('help_articles').select('*').order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: 'Could not load help articles.' });
  res.json({ data });
});

router.get('/creator-profile', async (_req, res) => {
  const { data, error } = await adminDb.from('creator_profiles').select('*').limit(1).maybeSingle();
  if (error) return res.status(400).json({ error: 'Could not load creator profile.' });
  res.json({ data });
});

router.patch('/organizations/:id', async (req, res) => {
  const { suspended } = req.body || {};
  if (typeof suspended !== 'boolean') return res.status(400).json({ error: 'suspended (boolean) is required.' });
  const { data, error } = await adminDb.from('organizations')
    .update({ suspended }).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: 'Could not update organization.' });
  await adminDb.from('platform_audit_logs').insert({
    action: suspended ? 'organization.suspend' : 'organization.unsuspend',
    target: data.name, details: `Organization ${suspended ? 'suspended' : 'reactivated'}.`,
    user_name: req.user.email, actor_id: req.user.id, result: 'Success'
  });
  res.json({ data });
});

router.patch('/config', async (req, res) => {
  const parsed = configSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid config update.' });
  const { data: existing } = await adminDb.from('platform_config').select('id').limit(1).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Platform config missing.' });
  const { data, error } = await adminDb.from('platform_config').update({ ...parsed.data, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();
  if (error) return res.status(400).json({ error: 'Could not update config.' });
  await platformLog('config.update', 'platform_config', req.user, JSON.stringify(parsed.data));
  res.json({ data });
});

// Content management (contributors, creator profile, help articles) — owner write, public read.
router.put('/creator-profile', async (req, res) => {
  const schema = z.object({
    full_name: z.string().min(1).max(200), title: z.string().min(1).max(300),
    biography: z.string().max(3000).default(''), photo_url: z.string().max(500).default(''),
    social_links: z.record(z.unknown()).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid creator profile.' });
  const { data: existing } = await adminDb.from('creator_profiles').select('id').limit(1).maybeSingle();
  const { data, error } = existing
    ? await adminDb.from('creator_profiles').update(parsed.data).eq('id', existing.id).select().single()
    : await adminDb.from('creator_profiles').insert(parsed.data).select().single();
  if (error) return res.status(400).json({ error: 'Could not save creator profile.' });
  await platformLog('creator_profile.update', data.id, req.user);
  res.json({ data });
});

const contributorSchema = z.object({
  name: z.string().trim().min(1).max(200), photo_url: z.string().max(500).default(''),
  role: z.string().max(200).default('Project Contributor'), contribution: z.string().max(500).default(''),
  biography: z.string().max(2000).default(''), display_order: z.number().int().min(0).default(0)
});
router.post('/contributors', async (req, res) => {
  const parsed = contributorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid contributor.' });
  const { data, error } = await adminDb.from('contributors').insert(parsed.data).select().single();
  if (error) return res.status(400).json({ error: 'Could not create contributor.' });
  await platformLog('contributor.create', data.id, req.user, data.name);
  res.status(201).json({ data });
});
router.delete('/contributors/:id', async (req, res) => {
  const { error } = await adminDb.from('contributors').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: 'Could not delete contributor.' });
  await platformLog('contributor.delete', req.params.id, req.user);
  res.status(204).end();
});

const helpSchema = z.object({
  category: z.string().trim().min(1).max(100), title: z.string().trim().min(1).max(300),
  content: z.string().max(10000).default(''), slug: z.string().max(120).default(''),
  order_index: z.number().int().min(0).default(0)
});
router.post('/help-articles', async (req, res) => {
  const parsed = helpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid help article.' });
  const { data, error } = await adminDb.from('help_articles')
    .insert({ ...parsed.data, slug: parsed.data.slug || parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') }).select().single();
  if (error) return res.status(400).json({ error: 'Could not create help article.' });
  await platformLog('help_article.create', data.id, req.user, data.title);
  res.status(201).json({ data });
});
router.delete('/help-articles/:id', async (req, res) => {
  const { error } = await adminDb.from('help_articles').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: 'Could not delete help article.' });
  await platformLog('help_article.delete', req.params.id, req.user);
  res.status(204).end();
});

export default router;
