import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership, requireCase, canWrite, canReport, isAdmin, isReadOnly } from '../middleware/auth.js';
import { audit, notify, nextCaseNumber, zodMessage, listUserDirectory } from '../lib.js';
import { applyDeduction, reverseDeduction, createPendingDeduction, cancelPendingDeduction, scoringRules } from '../services/scoring.js';

const router = Router();

// Valid status transitions (configurable in the UI; enforced here).
const TRANSITIONS = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['awaiting_decision', 'resolved'],
  awaiting_decision: ['resolved', 'under_review'],
  resolved: ['appealed', 'closed'],
  appealed: ['resolved', 'closed'],
  closed: []
};

async function loadCase(id, institutionId) {
  const { data, error } = await adminDb.from('incidents')
    .select('*, people!inner(full_name, person_id, class_unit_id, department_unit_id)')
    .eq('id', id).eq('institution_id', institutionId).maybeSingle();
  if (error) return null;
  return data;
}

function caseView(row) {
  const { people, ...rest } = row;
  return { ...rest, person: people || null };
}

// ---------- list ----------
router.get('/', requireAuth, requireMembership(), async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '25', 10) || 25, 1), 100);
  let query = adminDb.from('incidents')
    .select('*, people!inner(full_name, person_id), incident_categories(name)', { count: 'exact' })
    .eq('institution_id', req.institutionId);
  if (req.query.status) query = query.eq('status', req.query.status);
  if (req.query.severity) query = query.eq('severity', req.query.severity);
  if (req.query.category_id) query = query.eq('category_id', req.query.category_id);
  if (req.query.person_id) query = query.eq('person_id', req.query.person_id);
  if (req.query.assigned_officer_user_id) query = query.eq('assigned_officer_user_id', req.query.assigned_officer_user_id);
  if (req.query.term) query = query.eq('term', Number(req.query.term));
  if (req.query.from) query = query.gte('incident_date', req.query.from);
  if (req.query.to) query = query.lte('incident_date', req.query.to);
  if (req.query.search) {
    const s = String(req.query.search).replace(/[%,]/g, '');
    query = query.or(`case_number.ilike.%${s}%,category_name.ilike.%${s}%,description.ilike.%${s}%`);
  }
  const { data, error, count } = await query
    .order('incident_date', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (error) return res.status(500).json({ error: 'Could not load cases.' });
  const rows = (data || []).map(r => {
    const { people, incident_categories, ...rest } = r;
    return { ...rest, person_name: people?.full_name, person_code: people?.person_id, category_label: rest.category_name || incident_categories?.name || null };
  });
  res.json({ data: rows, page, limit, total: count || 0, has_more: (page * limit) < (count || 0) });
});

// ---------- create ----------
const createSchema = z.object({
  institution_id: z.string().uuid(),
  person_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  category_name: z.string().max(200).optional().nullable(),
  severity: z.enum(['minor', 'moderate', 'serious', 'not_applicable']).optional(),
  description: z.string().min(5).max(10000),
  location: z.string().max(300).optional().nullable(),
  incident_date: z.string().min(8).max(30),
  term: z.number().int().min(1).max(3).optional().nullable(),
  status: z.enum(['draft', 'submitted']).optional()
});

router.post('/', requireAuth, requireMembership(), async (req, res) => {
  if (!canReport(req.role)) return res.status(403).json({ error: 'Your role cannot report incidents.' });
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid incident details.') });
  const d = parsed.data;
  if (d.institution_id !== req.institutionId) return res.status(403).json({ error: 'Institution mismatch.' });
  const { data: inst } = await adminDb.from('institutions').select('id, track').eq('id', req.institutionId).maybeSingle();
  const { data: person } = await adminDb.from('people').select('id, full_name, status').eq('id', d.person_id).eq('institution_id', req.institutionId).maybeSingle();
  if (!person) return res.status(400).json({ error: 'Person not found in this institution.' });
  if (person.status === 'archived') return res.status(400).json({ error: 'This person is archived. Restore them first.' });

  // duplicate protection: same person, same category, same date, still open
  if (d.category_id) {
    const { data: dupe } = await adminDb.from('incidents').select('id, case_number')
      .eq('institution_id', req.institutionId).eq('person_id', d.person_id)
      .eq('category_id', d.category_id).eq('incident_date', d.incident_date)
      .neq('status', 'closed').maybeSingle();
    if (dupe) return res.status(409).json({ error: `A case for this person, category and date already exists (${dupe.case_number}).` });
  }

  let categoryName = d.category_name || null;
  let severity = d.severity || null;
  if (d.category_id) {
    const { data: cat } = await adminDb.from('incident_categories').select('name, severity')
      .eq('id', d.category_id).eq('institution_id', req.institutionId).maybeSingle();
    if (!cat) return res.status(400).json({ error: 'Category not found in this institution.' });
    categoryName = categoryName || cat.name;
    severity = severity || cat.severity;
  }
  const case_number = await nextCaseNumber(req.institutionId);
  const { data, error } = await adminDb.from('incidents').insert({
    ...d, case_number, track: inst?.track || 'HIGH_SCHOOL', category_name: categoryName,
    severity: severity || 'minor', status: d.status || 'submitted', created_by: req.user.id
  }).select().single();
  if (error) return res.status(400).json({ error: 'Could not record the incident.' });
  // High-school track: surface the pending deduction immediately (pending never counts
  // toward the remaining marks until a decision approves it).
  if ((inst?.track || '') === 'HIGH_SCHOOL' && d.category_id) {
    const { data: catRow } = await adminDb.from('incident_categories').select('default_deduction').eq('id', d.category_id).maybeSingle();
    await createPendingDeduction({
      institutionId: req.institutionId, personId: d.person_id, incidentId: data.id,
      term: d.term || 1, amount: catRow?.default_deduction || 0, caseNumber: data.case_number
    });
  }
  await audit(req.institutionId, req.user.id, req.user.full_name, 'create', 'incident', data.id, { case_number: data.case_number, person_id: d.person_id });

  // notify institution admins + officers about a new case
  const { data: staff } = await adminDb.from('institution_memberships').select('user_id, role')
    .eq('institution_id', req.institutionId).in('role', ['institution_admin', 'disciplinary_officer']);
  await notify((staff || []).map(s => s.user_id).filter(id => id !== req.user.id), req.institutionId,
    'case_created', 'New case reported', `${data.case_number}: ${categoryName || 'Incident'} for ${person.full_name}.`, `/incidents/${data.id}`);
  res.status(201).json({ data });
});

// ---------- detail ----------
router.get('/:id', requireAuth, requireCase(), async (req, res) => {
  const row = await loadCase(req.params.id, req.institutionId);
  if (!row) return res.status(404).json({ error: 'Case not found in this institution.' });
  const [evidence, assignments, reviews, decisions, corrective, appeals, followUps] = await Promise.all([
    adminDb.from('incident_evidence').select('id, file_name, mime_type, size_bytes, description, created_at, uploaded_by').eq('incident_id', row.id),
    adminDb.from('case_assignments').select('*').eq('incident_id', row.id).order('created_at', { ascending: false }),
    adminDb.from('case_reviews').select('*').eq('incident_id', row.id).order('created_at', { ascending: false }),
    adminDb.from('case_decisions').select('*').eq('incident_id', row.id).order('created_at', { ascending: false }),
    adminDb.from('corrective_actions').select('*').eq('incident_id', row.id).order('created_at', { ascending: false }),
    adminDb.from('appeals').select('*').eq('incident_id', row.id).order('created_at', { ascending: false }),
    adminDb.from('follow_up_tasks').select('*').eq('incident_id', row.id).order('created_at', { ascending: false })
  ]);
  const directory = await listUserDirectory(2);
  const named = (rows) => (rows || []).map(r => ({
    ...r,
    actor_name: directory.byId[r.officer_user_id || r.reviewer_user_id || r.decided_by || r.assigned_to || r.requested_by || r.uploaded_by || r.created_by]?.full_name
      || directory.byId[r.officer_user_id || r.reviewer_user_id || r.decided_by || r.assigned_to || r.requested_by || r.uploaded_by || r.created_by]?.email || null
  }));
  res.json({
    data: {
      ...caseView(row),
      evidence: evidence.data || [],
      assignments: named(assignments.data), reviews: named(reviews.data), decisions: named(decisions.data),
      corrective_actions: named(corrective.data), appeals: named(appeals.data), follow_ups: named(followUps.data),
      transitions: TRANSITIONS[row.status] || []
    }
  });
});

// ---------- update ----------
const patchSchema = z.object({
  description: z.string().min(5).max(10000).optional(),
  location: z.string().max(300).optional().nullable(),
  severity: z.enum(['minor', 'moderate', 'serious', 'not_applicable']).optional(),
  category_id: z.string().uuid().nullable().optional(),
  incident_date: z.string().min(8).max(30).optional(),
  term: z.number().int().min(1).max(3).nullable().optional(),
  follow_up_date: z.string().nullable().optional(),
  status: z.enum(['draft', 'submitted', 'under_review', 'awaiting_decision', 'resolved', 'appealed', 'closed']).optional()
});

router.patch('/:id', requireAuth, requireCase(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot edit cases.' });
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid case update.') });
  const changes = { ...parsed.data };
  if (changes.status && changes.status !== existing.status) {
    if (!TRANSITIONS[existing.status]?.includes(changes.status)) {
      return res.status(400).json({ error: `A case cannot move from ${existing.status} to ${changes.status}.` });
    }
    if (changes.status === 'closed' && !isAdmin(req.role)) return res.status(403).json({ error: 'Only an institution admin can close a case.' });
    if (changes.status === 'resolved') return res.status(403).json({ error: 'Use the decision action to resolve a case.' });
  }
  if (changes.category_id) {
    const { data: cat } = await adminDb.from('incident_categories').select('name').eq('id', changes.category_id).eq('institution_id', req.institutionId).maybeSingle();
    if (!cat) return res.status(400).json({ error: 'Category not found in this institution.' });
    changes.category_name = cat.name;
  }
  if (changes.status === 'closed') changes.closure_date = new Date().toISOString().slice(0, 10);
  const { data, error } = await adminDb.from('incidents').update(changes).eq('id', existing.id).select().single();
  if (error) return res.status(400).json({ error: 'Could not save the case.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'update', 'incident', data.id, { fields: Object.keys(changes) });
  res.json({ data });
});

// ---------- assignment ----------
router.post('/:id/assign', requireAuth, requireCase(), async (req, res) => {
  if (!isAdmin(req.role) && req.role !== 'disciplinary_officer') return res.status(403).json({ error: 'Only admins and disciplinary officers can assign cases.' });
  const { officer_user_id, note } = req.body || {};
  if (!officer_user_id) return res.status(400).json({ error: 'Choose the officer to assign.' });
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  if (existing.status === 'closed') return res.status(400).json({ error: 'Closed cases must be reopened before reassignment.' });
  const { data: membership } = await adminDb.from('institution_memberships').select('role, status')
    .eq('institution_id', req.institutionId).eq('user_id', officer_user_id).maybeSingle();
  if (!membership || membership.status !== 'active') return res.status(400).json({ error: 'That person is not an active member of this institution.' });
  if (!['institution_admin', 'disciplinary_officer', 'reviewer'].includes(membership.role)) {
    return res.status(400).json({ error: 'Cases can only be assigned to admins, officers or reviewers.' });
  }
  await adminDb.from('case_assignments').insert({ incident_id: existing.id, officer_user_id, assigned_by: req.user.id, note: note || null });
  const nextStatus = ['draft', 'submitted'].includes(existing.status) ? 'under_review' : existing.status;
  const { data } = await adminDb.from('incidents')
    .update({ assigned_officer_user_id: officer_user_id, status: nextStatus }).eq('id', existing.id).select().single();
  await audit(req.institutionId, req.user.id, req.user.full_name, 'case.assign', 'incident', existing.id, { officer_user_id, note });
  await notify([officer_user_id], req.institutionId, 'case_assigned', 'A case was assigned to you', `${existing.case_number} is now assigned to you.`, `/incidents/${existing.id}`);
  res.json({ data });
});

// ---------- review ----------
router.post('/:id/reviews', requireAuth, requireCase(), async (req, res) => {
  if (isReadOnly(req.role)) return res.status(403).json({ error: 'Auditors cannot add review notes.' });
  if (!['institution_admin', 'disciplinary_officer', 'reviewer', 'platform_owner'].includes(req.role)) {
    return res.status(403).json({ error: 'Only reviewers, officers and admins can record a review.' });
  }
  const { notes, outcome } = req.body || {};
  if (!notes || String(notes).trim().length < 3) return res.status(400).json({ error: 'Review notes are required.' });
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  const { data, error } = await adminDb.from('case_reviews').insert({
    incident_id: existing.id, reviewer_user_id: req.user.id, notes: String(notes).slice(0, 8000), outcome: outcome || null
  }).select().single();
  if (error) return res.status(400).json({ error: 'Could not save the review.' });
  let nextStatus = existing.status;
  if (['draft', 'submitted'].includes(existing.status)) nextStatus = 'under_review';
  if (['under_review'].includes(existing.status) && req.role !== 'reviewer') nextStatus = 'awaiting_decision';
  if (nextStatus !== existing.status) await adminDb.from('incidents').update({ status: nextStatus }).eq('id', existing.id);
  await audit(req.institutionId, req.user.id, req.user.full_name, 'case.review', 'incident', existing.id, { outcome });
  res.status(201).json({ data });
});

// ---------- decision (separation of duties: admins decide; officers and reviewers do not) ----------
const decisionSchema = z.object({
  decision: z.enum(['approved', 'dismissed', 'escalated', 'other']),
  rationale: z.string().min(5).max(8000),
  corrective_action: z.string().max(4000).optional().nullable(),
  deduction_amount: z.number().min(0).max(1000).optional(),
  term: z.number().int().min(1).max(3).optional()
});

router.post('/:id/decision', requireAuth, requireCase('institution_admin', 'platform_owner'), async (req, res) => {
  const parsed = decisionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid decision.') });
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  if (existing.status === 'closed') return res.status(400).json({ error: 'This case is closed. Reopen it to record a new decision.' });
  const { decision, rationale, corrective_action, deduction_amount, term } = parsed.data;
  const { data: inst } = await adminDb.from('institutions').select('track').eq('id', req.institutionId).maybeSingle();
  const rules = await scoringRules(req.institutionId);

  let deduction = Number(deduction_amount || 0);
  if (decision === 'approved' && !deduction && existing.category_id) {
    const { data: cat } = await adminDb.from('incident_categories').select('default_deduction').eq('id', existing.category_id).maybeSingle();
    deduction = Number(cat?.default_deduction || 0);
  }
  // Only scoring tracks deduct marks; university and org tracks stay policy-driven.
  if (inst?.track !== 'HIGH_SCHOOL') deduction = Number(deduction_amount || 0);

  if (decision === 'approved' && deduction > 0) {
    const { data: applied, error } = await adminDb.from('score_transactions').select('id')
      .eq('incident_id', existing.id).eq('status', 'approved').eq('kind', 'deduction').maybeSingle();
    if (applied) deduction = 0; // idempotent: never double-deduct for one case
  }

  const { data: decisionRow, error } = await adminDb.from('case_decisions').insert({
    incident_id: existing.id, decided_by: req.user.id, decision, rationale,
    corrective_action: corrective_action || null, deduction_amount: deduction
  }).select().single();
  if (error) return res.status(400).json({ error: 'Could not record the decision.' });

  let scoreResult = null;
  if (decision === 'approved' && deduction > 0) {
    try {
      scoreResult = await applyDeduction({
        institutionId: req.institutionId, personId: existing.person_id, incidentId: existing.id,
        term: term || existing.term || 1, amount: deduction,
        note: `Case ${existing.case_number}`, decidedBy: req.user.id
      });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  if (corrective_action) {
    await adminDb.from('corrective_actions').insert({
      incident_id: existing.id, action: corrective_action, created_by: req.user.id, status: 'open'
    });
  }
  if (decision === 'dismissed') {
    await cancelPendingDeduction({ incidentId: existing.id, reason: 'case dismissed' });
  }
  const newStatus = decision === 'escalated' ? 'awaiting_decision' : 'resolved';
  const { data: updated } = await adminDb.from('incidents')
    .update({ status: newStatus, decided_at: new Date().toISOString() }).eq('id', existing.id).select().single();

  await audit(req.institutionId, req.user.id, req.user.full_name, 'case.decision', 'incident', existing.id,
    { decision, deduction, rationale_short: rationale.slice(0, 200) });
  const recipients = [existing.created_by, existing.assigned_officer_user_id].filter(Boolean).filter(id => id !== req.user.id);
  await notify(recipients, req.institutionId, 'case_decided', `Decision recorded: ${decision}`,
    `${existing.case_number} was decided.`, `/incidents/${existing.id}`);
  res.status(201).json({ data: { decision: decisionRow, case: updated, deduction_applied: deduction, score: scoreResult } });
});

// ---------- appeals ----------
router.post('/:id/appeals', requireAuth, requireCase(), async (req, res) => {
  if (isReadOnly(req.role)) return res.status(403).json({ error: 'Auditors cannot file appeals.' });
  if (!['institution_admin', 'disciplinary_officer', 'platform_owner'].includes(req.role)) {
    return res.status(403).json({ error: 'Only admins and disciplinary officers can record an appeal.' });
  }
  const { reason } = req.body || {};
  if (!reason || String(reason).trim().length < 5) return res.status(400).json({ error: 'Explain the grounds for the appeal.' });
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  const { data: decided } = await adminDb.from('case_decisions').select('id').eq('incident_id', existing.id).limit(1).maybeSingle();
  if (!decided) return res.status(400).json({ error: 'Only a decided case can be appealed.' });
  const { data, error } = await adminDb.from('appeals').insert({
    incident_id: existing.id, requested_by: req.user.id, reason: String(reason).slice(0, 8000), status: 'submitted'
  }).select().single();
  if (error) return res.status(400).json({ error: 'Could not record the appeal.' });
  await adminDb.from('incidents').update({ status: 'appealed' }).eq('id', existing.id);
  await audit(req.institutionId, req.user.id, req.user.full_name, 'case.appeal', 'incident', existing.id, {});
  res.status(201).json({ data });
});

router.patch('/:id/appeals/:appealId', requireAuth, requireCase('institution_admin', 'platform_owner'), async (req, res) => {
  const { status, outcome } = req.body || {};
  const allowed = ['submitted', 'under_review', 'upheld', 'overturned', 'rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid appeal status.' });
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  const { data: appeal } = await adminDb.from('appeals').select('id').eq('id', req.params.appealId).eq('incident_id', existing.id).maybeSingle();
  if (!appeal) return res.status(404).json({ error: 'Appeal not found on this case.' });
  const { data, error } = await adminDb.from('appeals').update({
    status, outcome: outcome || null, reviewed_by: req.user.id, reviewed_at: new Date().toISOString()
  }).eq('id', appeal.id).select().single();
  if (error) return res.status(400).json({ error: 'Could not update the appeal.' });
  let reversal = null;
  if (status === 'overturned') {
    reversal = await reverseDeduction({ institutionId: req.institutionId, incidentId: existing.id, decidedBy: req.user.id, reason: 'Appeal overturned.' });
    if (reversal?.reversed > 0) {
      await audit(req.institutionId, req.user.id, req.user.full_name, 'score.reverse', 'incident', existing.id, { reason: 'appeal overturned', count: reversal.reversed });
    }
    await adminDb.from('incidents').update({ status: 'closed', closure_date: new Date().toISOString().slice(0, 10) }).eq('id', existing.id);
  } else if (['upheld', 'rejected'].includes(status)) {
    await adminDb.from('incidents').update({ status: 'resolved' }).eq('id', existing.id);
  }
  await audit(req.institutionId, req.user.id, req.user.full_name, 'appeal.decision', 'appeal', appeal.id, { status });
  res.json({ data: { appeal: data, reversal } });
});

// ---------- corrective actions & follow-ups ----------
router.post('/:id/corrective-actions', requireAuth, requireCase(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot add corrective actions.' });
  const { action, due_date, assigned_to } = req.body || {};
  if (!action || String(action).trim().length < 3) return res.status(400).json({ error: 'Describe the corrective action.' });
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  const { data, error } = await adminDb.from('corrective_actions').insert({
    incident_id: existing.id, action: String(action).slice(0, 4000), due_date: due_date || null,
    assigned_to: assigned_to || null, created_by: req.user.id
  }).select().single();
  if (error) return res.status(400).json({ error: 'Could not save the corrective action.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'corrective.create', 'incident', existing.id, {});
  if (assigned_to) await notify([assigned_to], req.institutionId, 'corrective_assigned', 'Corrective action assigned', `${existing.case_number}: ${action}`, `/incidents/${existing.id}`);
  res.status(201).json({ data });
});

router.patch('/:id/corrective-actions/:actionId', requireAuth, requireCase(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot update corrective actions.' });
  const { status } = req.body || {};
  if (!['open', 'in_progress', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const { data, error } = await adminDb.from('corrective_actions').update({ status })
    .eq('id', req.params.actionId).eq('incident_id', req.params.id).select().single();
  if (error) return res.status(404).json({ error: 'Corrective action not found.' });
  res.json({ data });
});

router.post('/:id/follow-ups', requireAuth, requireCase(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot add follow-ups.' });
  const { title, due_date, assigned_to } = req.body || {};
  if (!title || String(title).trim().length < 3) return res.status(400).json({ error: 'Describe the follow-up task.' });
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  const { data, error } = await adminDb.from('follow_up_tasks').insert({
    institution_id: req.institutionId, incident_id: existing.id, person_id: existing.person_id,
    title: String(title).slice(0, 300), due_date: due_date || null, assigned_to: assigned_to || null, created_by: req.user.id
  }).select().single();
  if (error) return res.status(400).json({ error: 'Could not save the follow-up.' });
  if (assigned_to) await notify([assigned_to], req.institutionId, 'followup_assigned', 'Follow-up assigned', `${existing.case_number}: ${title}`, `/incidents/${existing.id}`);
  await audit(req.institutionId, req.user.id, req.user.full_name, 'followup.create', 'incident', existing.id, { title });
  res.status(201).json({ data });
});

router.patch('/:id/follow-ups/:taskId', requireAuth, requireCase(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot update follow-ups.' });
  const { status } = req.body || {};
  if (!['open', 'in_progress', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const { data, error } = await adminDb.from('follow_up_tasks').update({ status })
    .eq('id', req.params.taskId).eq('incident_id', req.params.id).eq('institution_id', req.institutionId).select().single();
  if (error) return res.status(404).json({ error: 'Follow-up not found.' });
  res.json({ data });
});

// ---------- close / reopen ----------
router.post('/:id/close', requireAuth, requireCase('institution_admin', 'platform_owner'), async (req, res) => {
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  const { data: decisions } = await adminDb.from('case_decisions').select('id').eq('incident_id', existing.id).limit(1);
  if (!decisions?.length) return res.status(400).json({ error: 'A case needs a recorded decision before it can be closed.' });
  const { data } = await adminDb.from('incidents').update({ status: 'closed', closure_date: new Date().toISOString().slice(0, 10) })
    .eq('id', existing.id).select().single();
  await audit(req.institutionId, req.user.id, req.user.full_name, 'case.close', 'incident', existing.id, {});
  res.json({ data });
});

router.post('/:id/reopen', requireAuth, requireCase('institution_admin', 'platform_owner'), async (req, res) => {
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  if (existing.status !== 'closed') return res.status(400).json({ error: 'Only a closed case can be reopened.' });
  const { reason } = req.body || {};
  if (!reason || String(reason).trim().length < 5) return res.status(400).json({ error: 'Explain why the case is being reopened.' });
  const { data } = await adminDb.from('incidents').update({ status: 'under_review', closure_date: null })
    .eq('id', existing.id).select().single();
  await audit(req.institutionId, req.user.id, req.user.full_name, 'case.reopen', 'incident', existing.id, { reason });
  res.json({ data });
});

// ---------- evidence (private storage, signed URLs only) ----------
router.post('/:id/evidence', requireAuth, requireCase(), async (req, res) => {
  if (!canReport(req.role)) return res.status(403).json({ error: 'Your role cannot upload evidence.' });
  const { file_name, mime_type, data_base64, description } = req.body || {};
  if (!data_base64) return res.status(400).json({ error: 'A file is required.' });
  const allowed = /^(image\/(png|jpe?g|webp|gif)|application\/pdf|text\/plain|application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet))$/;
  if (!allowed.test(mime_type || '')) return res.status(400).json({ error: 'Allowed evidence: images, PDF, text, Word or Excel files.' });
  const buffer = Buffer.from(String(data_base64).replace(/^data:[^,]+,/, ''), 'base64');
  if (buffer.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'Evidence files must be 4 MB or smaller.' });
  const existing = await loadCase(req.params.id, req.institutionId);
  if (!existing) return res.status(404).json({ error: 'Case not found in this institution.' });
  const path = `evidence/${req.institutionId}/${existing.id}/${Date.now()}-${(file_name || 'evidence').replace(/[^\w.\-]/g, '_')}`;
  const { error: upErr } = await adminDb.storage.from('dm-files').upload(path, buffer, { contentType: mime_type });
  if (upErr) return res.status(400).json({ error: 'Could not store the evidence file.' });
  const { data, error } = await adminDb.from('incident_evidence').insert({
    incident_id: existing.id, file_name: file_name || 'evidence', storage_path: path,
    mime_type, size_bytes: buffer.length, description: description || null, uploaded_by: req.user.id
  }).select().single();
  if (error) return res.status(400).json({ error: 'Could not attach the evidence.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'evidence.upload', 'incident', existing.id, { file_name });
  res.status(201).json({ data });
});

router.get('/:id/evidence/:evidenceId/url', requireAuth, requireCase(), async (req, res) => {
  const { data: ev } = await adminDb.from('incident_evidence').select('*')
    .eq('id', req.params.evidenceId).eq('incident_id', req.params.id).maybeSingle();
  if (!ev) return res.status(404).json({ error: 'Evidence not found.' });
  const { data, error } = await adminDb.storage.from('dm-files').createSignedUrl(ev.storage_path, 300);
  if (error || !data?.signedUrl) return res.status(400).json({ error: 'Could not create a download link.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'evidence.download', 'incident', req.params.id, { file_name: ev.file_name });
  res.json({ data: { url: data.signedUrl, expires_in: 300, file_name: ev.file_name } });
});

router.delete('/:id/evidence/:evidenceId', requireAuth, requireCase(), async (req, res) => {
  if (!isAdmin(req.role) && req.role !== 'disciplinary_officer') return res.status(403).json({ error: 'Only admins and officers can remove evidence.' });
  const { data: ev } = await adminDb.from('incident_evidence').select('*')
    .eq('id', req.params.evidenceId).eq('incident_id', req.params.id).maybeSingle();
  if (!ev) return res.status(404).json({ error: 'Evidence not found.' });
  await adminDb.storage.from('dm-files').remove([ev.storage_path]);
  await adminDb.from('incident_evidence').delete().eq('id', ev.id);
  await audit(req.institutionId, req.user.id, req.user.full_name, 'evidence.delete', 'incident', req.params.id, { file_name: ev.file_name });
  res.json({ data: { deleted: true } });
});

export default router;
