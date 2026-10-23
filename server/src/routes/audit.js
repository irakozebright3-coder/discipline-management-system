import { Router } from 'express';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership } from '../middleware/auth.js';

const router = Router();

// History + audit for one institution, filterable by entity, action, date range.
router.get('/', requireAuth, requireMembership(), async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '25', 10) || 25, 1), 100);
  let query = adminDb.from('audit_logs').select('*', { count: 'exact' }).eq('institution_id', req.institutionId);
  if (req.query.entity_type) query = query.eq('entity_type', req.query.entity_type);
  if (req.query.action) query = query.eq('action', req.query.action);
  if (req.query.actor_id) query = query.eq('actor_id', req.query.actor_id);
  if (req.query.from) query = query.gte('created_at', req.query.from);
  if (req.query.to) query = query.lte('created_at', req.query.to + (String(req.query.to).length === 10 ? 'T23:59:59' : ''));
  if (req.query.search) {
    const s = String(req.query.search).replace(/[%,]/g, '');
    query = query.or(`action.ilike.%${s}%,actor_name.ilike.%${s}%,entity_type.ilike.%${s}%`);
  }
  const { data, error, count } = await query.order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (error) return res.status(500).json({ error: 'Could not load the audit history.' });
  res.json({ data: data || [], page, limit, total: count || 0, has_more: (page * limit) < (count || 0) });
});

export default router;
