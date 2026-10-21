import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { zodMessage } from '../lib.js';

const router = Router();

// Public landing stats (real counts; visits tracked).
router.get('/stats', async (_req, res) => {
  try {
    const [inst, people, incidents] = await Promise.all([
      adminDb.from('institutions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      adminDb.from('people').select('id', { count: 'exact', head: true }),
      adminDb.from('incidents').select('id', { count: 'exact', head: true })
    ]);
    const { data: settings } = await adminDb.from('platform_settings').select('app_settings').eq('id', 1).maybeSingle();
    const visitors = Number(settings?.app_settings?.visitors || 0) + 1;
    await adminDb.from('platform_settings').update({ app_settings: { ...settings.app_settings, visitors } }).eq('id', 1);
    res.json({ data: { institutions: inst.count || 0, people: people.count || 0, incidents: incidents.count || 0, visitors } });
  } catch (e) {
    res.json({ data: { institutions: 0, people: 0, incidents: 0, visitors: 0 } });
  }
});

router.get('/help-articles', async (_req, res) => {
  const { data } = await adminDb.from('help_articles').select('*').order('order_index').order('created_at');
  res.json({ data: data || [] });
});

router.get('/faqs', async (_req, res) => {
  const { data } = await adminDb.from('help_articles').select('*').ilike('category', '%faq%').order('order_index').order('created_at');
  res.json({ data: data || [] });
});

router.get('/creator-profile', async (_req, res) => {
  const { data } = await adminDb.from('creator_profiles').select('full_name, title, biography, photo_url').limit(1).maybeSingle();
  const { data: settings } = await adminDb.from('platform_settings').select('app_settings').eq('id', 1).maybeSingle();
  const content = settings?.app_settings || {};
  res.json({ data: { ...(data || {}), contact_email: content.contact_email || null, support_email: content.support_email || null, about: content.about || null, footer_text: content.footer_text || null, copyright: content.copyright || null } });
});

router.get('/contributors', async (_req, res) => {
  const { data } = await adminDb.from('contributors').select('*').order('created_at');
  res.json({ data: data || [] });
});

const supportSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  website: z.string().max(0).optional() // honeypot: humans never fill this
});

router.post('/support', async (req, res) => {
  const parsed = supportSchema.safeParse(req.body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return res.status(400).json({ error: flat.formErrors[0] || Object.values(flat.fieldErrors)[0]?.[0] || 'Invalid request.' });
  }
  if (parsed.data.website) return res.status(400).json({ error: 'Invalid request.' });
  // basic throttle: max 5 open requests per email per day
  const { count } = await adminDb.from('support_requests').select('id', { count: 'exact', head: true })
    .eq('email', parsed.data.email.toLowerCase()).gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  if ((count || 0) >= 5) return res.status(429).json({ error: 'You have several recent requests. We will reply before you can send more.' });
  const { error } = await adminDb.from('support_requests').insert({
    name: parsed.data.name, email: parsed.data.email.toLowerCase(), subject: parsed.data.subject, message: parsed.data.message
  });
  if (error) return res.status(500).json({ error: 'Could not send your request right now. Please try again.' });
  res.status(201).json({ data: { received: true } });
});

export default router;
