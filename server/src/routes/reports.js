import { Router } from 'express';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership } from '../middleware/auth.js';
import { toCsv } from '../lib.js';
import { personScores } from '../services/scoring.js';

const router = Router();

function buildFilters(query, q) {
  if (q.status) query = query.eq('status', q.status);
  if (q.severity) query = query.eq('severity', q.severity);
  if (q.category_id) query = query.eq('category_id', q.category_id);
  if (q.person_id) query = query.eq('person_id', q.person_id);
  if (q.term) query = query.eq('term', Number(q.term));
  if (q.from && q.to) {
    if (new Date(q.from) > new Date(q.to)) throw Object.assign(new Error('The start date must be before the end date.'), { status: 400 });
    query = query.gte('incident_date', q.from).lte('incident_date', q.to);
  } else if (q.from) query = query.gte('incident_date', q.from);
  else if (q.to) query = query.lte('incident_date', q.to);
  return query;
}

async function fetchCases(req) {
  const q = req.query;
  let query = adminDb.from('incidents')
    .select('*, people!inner(full_name, person_id), incident_categories(name)', { count: 'exact' })
    .eq('institution_id', req.institutionId);
  query = buildFilters(query, q);
  const page = Math.max(1, Number.parseInt(q.page || '1', 10) || 1);
  const limit = Math.min(Math.max(Number.parseInt(q.limit || '50', 10) || 50, 1), 1000);
  const { data, error, count } = await query.order('incident_date', { ascending: false }).range((page - 1) * limit, page * limit - 1);
  if (error) throw new Error('Could not load the report data.');
  return { rows: data || [], count: count || 0, page, limit };
}

// JSON summary + rows for preview.
router.get('/', requireAuth, requireMembership(), async (req, res) => {
  try {
    const { rows, count } = await fetchCases(req);
    const bySeverity = {}, byStatus = {}, byCategory = {}, byMonth = {};
    for (const r of rows) {
      bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      const cat = r.category_name || r.incident_categories?.name || 'Uncategorised';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      const m = String(r.incident_date).slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + 1;
    }
    res.json({ data: { total: count, rows, summary: { by_severity: bySeverity, by_status: byStatus, by_category: byCategory, by_month: byMonth } } });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// CSV export (server-side, permission checked, formula-injection safe).
router.get('/export.csv', requireAuth, requireMembership(), async (req, res) => {
  try {
    req.query.limit = '1000';
    const { rows } = await fetchCases(req);
    const inst = await adminDb.from('institutions').select('name').eq('id', req.institutionId).maybeSingle();
    const headers = ['Case number', 'Date', 'Person', 'Person ID', 'Category', 'Severity', 'Status', 'Term', 'Location', 'Description', 'Closed on'];
    const csvRows = rows.map(r => [
      r.case_number, r.incident_date, r.people?.full_name, r.people?.person_id,
      r.category_name || r.incident_categories?.name || '', r.severity, r.status, r.term || '',
      r.location || '', r.description || '', r.closure_date || ''
    ]);
    const meta = `Discipline Management report,${inst.data?.name || ''}\nGenerated,${new Date().toISOString()}\n`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="discipline-report-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(meta + toCsv(headers, csvRows));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// People score sheet for a high-school term/annual report (CSV).
router.get('/scores.csv', requireAuth, requireMembership('institution_admin', 'disciplinary_officer', 'reviewer', 'auditor', 'platform_owner'), async (req, res) => {
  try {
    const { data: people } = await adminDb.from('people').select('id, full_name, person_id, status')
      .eq('institution_id', req.institutionId).eq('status', 'active').order('full_name');
    const inst = await adminDb.from('institutions').select('name, track').eq('id', req.institutionId).maybeSingle();
    const headers = ['Student', 'Student ID', 'T1 start', 'T1 deductions', 'T1 remaining', 'T1 %', 'T2 start', 'T2 deductions', 'T2 remaining', 'T2 %', 'T3 start', 'T3 deductions', 'T3 remaining', 'T3 %', 'Annual', 'Annual %'];
    const csvRows = [];
    for (const p of people || []) {
      const s = await personScores(req.institutionId, p.id);
      csvRows.push([p.full_name, p.person_id,
        ...s.terms.flatMap(t => [t.starting_marks, t.approved_deductions, t.remaining, t.percentage]),
        s.annual.marks, s.annual.percentage]);
    }
    const meta = `Discipline score report,${inst.data?.name || ''}\nGenerated,${new Date().toISOString()}\n`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="discipline-scores-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(meta + toCsv(headers, csvRows));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

export default router;
