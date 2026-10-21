import { Router } from 'express';
import { adminDb } from '../supabase.js';
import { requireOrganizationRole } from '../middleware/auth.js';

const router = Router();
// Organization audit activity for the Settings page.
router.get('/', requireOrganizationRole, async (req, res) => {
  const { data, error } = await adminDb.from('audit_logs')
    .select('*').eq('organization_id', req.organizationId)
    .order('created_at', { ascending: false }).limit(200);
  if (error) return res.status(500).json({ error: 'Could not load audit logs.' });
  res.json({ data });
});
export default router;
