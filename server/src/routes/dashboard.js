import { Router } from 'express';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership } from '../middleware/auth.js';

const router = Router();

// Institution dashboard: real counts + trends. Track-specific extras are computed client-side.
router.get('/:institutionId', requireAuth, requireMembership(), async (req, res) => {
  const id = req.institutionId;
  const [people, incidents, followUps, appeals] = await Promise.all([
    adminDb.from('people').select('status', { count: 'exact' }).eq('institution_id', id),
    adminDb.from('incidents').select('status, severity, incident_date', { count: 'exact' }).eq('institution_id', id).order('incident_date', { ascending: false }).limit(500),
    adminDb.from('follow_up_tasks').select('status, due_date, title, incident_id', { count: 'exact' })
      .eq('institution_id', id).in('status', ['open', 'in_progress']).order('due_date').limit(20),
    adminDb.from('appeals').select('status', { count: 'exact' }).eq('status', 'submitted')
  ]);
  const incRows = incidents.data || [];
  const byStatus = {}, bySeverity = {}, byMonth = {};
  for (const i of incRows) {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    const m = String(i.incident_date).slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + 1;
  }
  res.json({
    data: {
      people_total: people.count || 0,
      incidents_total: incidents.count || 0,
      open_cases: ['draft', 'submitted', 'under_review', 'awaiting_decision'].reduce((s, k) => s + (byStatus[k] || 0), 0),
      resolved_cases: (byStatus.resolved || 0) + (byStatus.closed || 0),
      appealed_cases: byStatus.appealed || 0,
      pending_appeals: appeals.count || 0,
      by_status: byStatus, by_severity: bySeverity, by_month: byMonth,
      follow_ups: followUps.data || [],
      recent_dates: incRows.slice(0, 30).map(i => i.incident_date)
    }
  });
});

export default router;
