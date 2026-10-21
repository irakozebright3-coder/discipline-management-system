import { Router } from 'express';
import { adminDb } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const [list, unread] = await Promise.all([
    adminDb.from('notifications').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(50),
    adminDb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).is('read_at', null)
  ]);
  res.json({ data: list.data || [], unread: unread.count || 0 });
});

router.post('/read', requireAuth, async (req, res) => {
  const { ids } = req.body || {};
  if (Array.isArray(ids) && ids.length) {
    await adminDb.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id).in('id', ids.slice(0, 100));
  } else {
    await adminDb.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id).is('read_at', null);
  }
  res.json({ data: { read: true } });
});

export default router;
