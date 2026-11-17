import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership, canWrite, isReadOnly } from '../middleware/auth.js';
import { audit, zodMessage } from '../lib.js';
import { scoringRules } from '../services/scoring.js';

const router = Router();

// Discipline level from a percentage of conduct marks kept (0-100).
export function levelFor(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return { label: 'No data', tone: 'muted' };
  if (pct >= 90) return { label: 'Excellent', tone: 'good' };
  if (pct >= 75) return { label: 'Good', tone: 'ok' };
  if (pct >= 60) return { label: 'Fair', tone: 'warn' };
  if (pct >= 40) return { label: 'Poor', tone: 'bad' };
  return { label: 'Critical', tone: 'bad' };
}

// Pulls every person's approved deductions in one query and derives their marks.
async function marksByPerson(institutionId, personIds) {
  const rules = await scoringRules(institutionId);
  const starting = Number(rules.starting_marks);
  const terms = Number(rules.term_count);
  const maxAnnual = Number(rules.max_annual);
  const byPerson = new Map(personIds.map(id => [id, { deducted: [0, 0, 0, 0], pending: 0 }]));
  if (personIds.length) {
    const { data: txs } = await adminDb.from('score_transactions')
      .select('person_id, term, amount, kind, status')
      .eq('institution_id', institutionId).in('person_id', personIds);
    for (const t of txs || []) {
      const row = byPerson.get(t.person_id);
      if (!row) continue;
      if (t.status === 'approved' && (t.kind === 'deduction' || t.kind === 'adjustment')) {
        if (t.term >= 1 && t.term <= terms) row.deducted[t.term] += Number(t.amount);
      } else if (t.status === 'pending' && t.kind === 'deduction') {
        row.pending += Number(t.amount);
      }
    }
  }
  const out = {};
  for (const [id, row] of byPerson) {
    let remainingTotal = 0;
    const perTerm = [];
    for (let t = 1; t <= terms; t++) {
      const remaining = Number((starting - row.deducted[t]).toFixed(2));
      remainingTotal += remaining;
      perTerm.push({ term: t, remaining, deducted: Number(row.deducted[t].toFixed(2)) });
    }
    const pct = maxAnnual > 0 ? Number(((remainingTotal / maxAnnual) * 100).toFixed(1)) : null;
    out[id] = { terms: perTerm, annual_marks: Number(remainingTotal.toFixed(2)), annual_max: maxAnnual, percentage: pct, pending: Number(row.pending.toFixed(2)), level: levelFor(pct) };
  }
  return { marks: out, rules: { starting_marks: starting, term_count: terms, max_annual: maxAnnual } };
}

function summarise(people, marks) {
  const scored = people.map(p => marks[p.id]?.percentage).filter(v => typeof v === 'number');
  const avg = scored.length ? Number((scored.reduce((s, v) => s + v, 0) / scored.length).toFixed(1)) : null;
  const dist = { Excellent: 0, Good: 0, Fair: 0, Poor: 0, Critical: 0 };
  for (const p of people) { const l = marks[p.id]?.level?.label; if (dist[l] !== undefined) dist[l]++; }
  return { students: people.length, average_percentage: avg, level: levelFor(avg), distribution: dist };
}

// Overview for any track: overall discipline level plus a breakdown by group.
router.get('/overview', requireAuth, requireMembership(), async (req, res) => {
  const { data: inst } = await adminDb.from('institutions').select('track').eq('id', req.institutionId).maybeSingle();
  const track = inst?.track || 'HIGH_SCHOOL';
  const [{ data: people }, { data: units }] = await Promise.all([
    adminDb.from('people').select('id, class_unit_id, trade_unit_id, department_unit_id, program_unit_id, cohort_unit_id').eq('institution_id', req.institutionId).neq('status', 'archived').limit(5000),
    adminDb.from('org_units').select('id, name, unit_type').eq('institution_id', req.institutionId)
  ]);
  const list = people || [];
  const { marks, rules } = await marksByPerson(req.institutionId, list.map(p => p.id));
  const groupKeys = { HIGH_SCHOOL: ['class_unit_id', 'trade_unit_id'], UNIVERSITY: ['department_unit_id', 'program_unit_id', 'cohort_unit_id'], COMPANY: ['department_unit_id'], ORGANIZATION: ['department_unit_id'], COMMUNITY: ['cohort_unit_id'] }[track] || ['class_unit_id'];
  const groups = [];
  for (const u of units || []) {
    const members = list.filter(p => groupKeys.some(k => p[k] === u.id));
    if (!members.length) continue;
    groups.push({ id: u.id, name: u.name, unit_type: u.unit_type, ...summarise(members, marks) });
  }
  groups.sort((a, b) => (a.average_percentage ?? 101) - (b.average_percentage ?? 101));
  res.json({ data: { track, rules, overall: summarise(list, marks), groups } });
});

// Portal list: every class and trade, with its discipline level.
router.get('/', requireAuth, requireMembership(), async (req, res) => {
  const [{ data: people }, { data: units }] = await Promise.all([
    adminDb.from('people').select('id, class_unit_id, trade_unit_id').eq('institution_id', req.institutionId).eq('person_type', 'student').neq('status', 'archived').limit(5000),
    adminDb.from('org_units').select('id, name, unit_type, parent_id').eq('institution_id', req.institutionId).in('unit_type', ['class', 'trade', 'stream'])
  ]);
  const list = people || [];
  const { marks } = await marksByPerson(req.institutionId, list.map(p => p.id));
  const portals = (units || []).map(u => {
    const members = list.filter(p => p.class_unit_id === u.id || p.trade_unit_id === u.id);
    return { id: u.id, name: u.name, unit_type: u.unit_type, parent_id: u.parent_id, ...summarise(members, marks) };
  }).sort((a, b) => a.unit_type.localeCompare(b.unit_type) || a.name.localeCompare(b.name));
  const unassigned = list.filter(p => !p.class_unit_id && !p.trade_unit_id);
  res.json({ data: { portals, unassigned: { students: unassigned.length } } });
});

// One portal: roster with each student's marks.
router.get('/:unitId', requireAuth, requireMembership(), async (req, res) => {
  const unitId = req.params.unitId;
  const isUnassigned = unitId === 'unassigned';
  let unit = null;
  if (!isUnassigned) {
    const { data } = await adminDb.from('org_units').select('id, name, unit_type').eq('id', unitId).eq('institution_id', req.institutionId).maybeSingle();
    if (!data) return res.status(404).json({ error: 'That class or trade was not found in this institution.' });
    unit = data;
  }
  let q = adminDb.from('people').select('id, person_id, full_name, status, gender, class_unit_id, trade_unit_id, guardian_name, guardian_phone')
    .eq('institution_id', req.institutionId).eq('person_type', 'student').neq('status', 'archived').order('full_name').limit(1000);
  q = isUnassigned ? q.is('class_unit_id', null).is('trade_unit_id', null) : q.or(`class_unit_id.eq.${unitId},trade_unit_id.eq.${unitId}`);
  const { data: students, error } = await q;
  if (error) return res.status(500).json({ error: 'Could not load this portal.' });
  const list = students || [];
  const { marks, rules } = await marksByPerson(req.institutionId, list.map(p => p.id));
  const roster = list.map(p => ({ ...p, ...marks[p.id] }));
  res.json({ data: { unit: unit || { id: 'unassigned', name: 'Unassigned students', unit_type: 'class' }, rules, summary: summarise(list, marks), students: roster } });
});

// Direct deduction by authorised staff. High School only. Recorded as an approved,
// audited score transaction against the chosen term, never a silent edit.
const deductSchema = z.object({
  institution_id: z.string().uuid(),
  person_id: z.string().uuid(),
  term: z.number().int().min(1).max(3),
  amount: z.number().positive().max(40),
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters.').max(500)
});

router.post('/deduct', requireAuth, requireMembership(), async (req, res) => {
  if (!canWrite(req.role) || isReadOnly(req.role)) return res.status(403).json({ error: 'Your role cannot deduct marks.' });
  const { data: inst } = await adminDb.from('institutions').select('track').eq('id', req.institutionId).maybeSingle();
  if (inst?.track !== 'HIGH_SCHOOL') return res.status(400).json({ error: 'Marks deduction is only available for High School institutions.' });
  const parsed = deductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid deduction.') });
  const d = parsed.data;
  const { data: person } = await adminDb.from('people').select('id, full_name, person_type').eq('id', d.person_id).eq('institution_id', req.institutionId).maybeSingle();
  if (!person) return res.status(404).json({ error: 'Student not found in this institution.' });
  if (person.person_type !== 'student') return res.status(400).json({ error: 'Marks can only be deducted from students.' });

  const rules = await scoringRules(req.institutionId);
  const { marks } = await marksByPerson(req.institutionId, [person.id]);
  const term = marks[person.id].terms.find(t => t.term === d.term);
  if (!rules.allow_negative && term && term.remaining - d.amount < 0) {
    return res.status(400).json({ error: `Term ${d.term} only has ${term.remaining} mark(s) left, so ${d.amount} cannot be deducted.` });
  }
  const { data, error } = await adminDb.from('score_transactions').insert({
    institution_id: req.institutionId, person_id: d.person_id, term: d.term, amount: d.amount,
    kind: 'deduction', status: 'approved', note: d.reason, decided_by: req.user.id
  }).select().single();
  if (error) return res.status(400).json({ error: 'Could not record the deduction.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'score.deduct', 'score_transaction', data.id,
    { person_id: d.person_id, student: person.full_name, term: d.term, amount: d.amount, reason: d.reason });
  const after = (await marksByPerson(req.institutionId, [person.id])).marks[person.id];
  res.status(201).json({ data: { transaction: data, marks: after } });
});

export default router;
