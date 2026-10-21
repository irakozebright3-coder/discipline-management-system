import { Router } from 'express';
import { adminDb } from '../supabase.js';

// Public, unauthenticated content for the marketing/help pages.
const router = Router();

router.get('/community-stats', async (_req, res) => {
  const [orgs, people, contributors, visits, incidents] = await Promise.all([
    adminDb.from('organizations').select('id, track', { count: 'exact', head: true }),
    adminDb.from('persons').select('id', { count: 'exact', head: true }),
    adminDb.from('contributors').select('id', { count: 'exact', head: true }),
    adminDb.from('platform_config').select('visitor_count').limit(1),
    adminDb.from('incidents').select('id', { count: 'exact', head: true })
  ]);
  // Bump the visitor counter on each public stats request.
  if (visits.data?.[0]) {
    await adminDb.from('platform_config')
      .update({ visitor_count: Number(visits.data[0].visitor_count || 0) + 1 })
      .eq('id', visits.data[0].id);
  }
  res.json({
    data: {
      organizations: orgs.count || 0,
      people: people.count || 0,
      incidents: incidents.count || 0,
      contributors: contributors.count || 0,
      visitors: Number(visits.data?.[0]?.visitor_count || 0) + 1
    }
  });
});

router.get('/contributors', async (_req, res) => {
  const { data, error } = await adminDb.from('contributors').select('*').order('display_order').order('name');
  if (error) return res.status(500).json({ error: 'Could not load contributors.' });
  res.json({ data });
});

router.get('/creator-profile', async (_req, res) => {
  const { data, error } = await adminDb.from('creator_profiles').select('*').limit(1).maybeSingle();
  if (error) return res.status(500).json({ error: 'Could not load creator profile.' });
  res.json({ data: data || null });
});

router.get('/help-articles', async (_req, res) => {
  const { data, error } = await adminDb.from('help_articles').select('*').order('order_index').order('title');
  if (error) return res.status(500).json({ error: 'Could not load help articles.' });
  res.json({ data });
});

router.get('/subscription-plans', async (_req, res) => {
  const { data, error } = await adminDb.from('subscription_plans').select('*').eq('active', true).order('order_index');
  if (error) return res.status(500).json({ error: 'Could not load plans.' });
  res.json({ data });
});

export default router;
