import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Lists the organizations the signed-in user belongs to, with their role.
// Used by the frontend to pick an active organization without extra setup.
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await adminDb.from('organization_members')
    .select('role, organizations(id, name, type, track, suspended)')
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: 'Could not load your organizations.' });
  const rows = (data || []).filter(m => m.organizations).map(m => ({
    organization: m.organizations,
    role: m.role
  }));
  res.json({ data: rows });
});

export default router;
