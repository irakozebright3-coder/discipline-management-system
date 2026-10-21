import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { zodMessage } from '../lib.js';

const router = Router();

// The caller's own profile (uses the real name, never the email as a name).
router.get('/me', requireAuth, async (req, res) => {
  const { data: profile } = await adminDb.from('profiles').select('full_name').eq('id', req.user.id).maybeSingle();
  const { data: memberships } = await adminDb.from('institution_memberships')
    .select('id, role, status, institution_id, institutions(id, name, type, track, status)')
    .eq('user_id', req.user.id);
  res.json({
    data: {
      id: req.user.id,
      email: req.user.email,
      full_name: profile?.full_name || req.user.full_name,
      memberships: memberships || []
    }
  });
});

const profileSchema = z.object({ full_name: z.string().min(2).max(200) });

router.patch('/me', requireAuth, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Enter your full name.') });
  const { data: existing } = await adminDb.from('profiles').select('id').eq('id', req.user.id).maybeSingle();
  if (existing) {
    await adminDb.from('profiles').update({ full_name: parsed.data.full_name }).eq('id', req.user.id);
  } else {
    await adminDb.from('profiles').insert({ id: req.user.id, full_name: parsed.data.full_name });
  }
  await adminDb.auth.admin.updateUserById(req.user.id, { data: { full_name: parsed.data.full_name } }).catch(() => {});
  res.json({ data: { full_name: parsed.data.full_name } });
});

export default router;
