import { adminDb } from '../supabase.js';

// Scores are derived from approved score_transactions against the institution's
// scoring rules. Pending transactions never count. Reversals mark the original
// transaction as reversed (it stops counting) and leave an audit record.
export async function scoringRules(institutionId) {
  const { data } = await adminDb.from('scoring_rules').select('*')
    .eq('institution_id', institutionId).eq('active', true)
    .order('created_at', { ascending: true }).limit(1).maybeSingle();
  return data || { starting_marks: 40, term_count: 3, max_annual: 120, allow_negative: false };
}

export async function personScores(institutionId, personId) {
  const rules = await scoringRules(institutionId);
  const { data: txs } = await adminDb.from('score_transactions')
    .select('id, term, amount, kind, status, note, incident_id, created_at, case:incidents(case_number, category_name, incident_date, status)')
    .eq('person_id', personId).order('created_at', { ascending: true });

  const starting = Number(rules.starting_marks);
  const terms = [];
  for (let t = 1; t <= rules.term_count; t++) {
    const approved = (txs || []).filter(x => x.term === t && x.status === 'approved' && (x.kind === 'deduction' || x.kind === 'adjustment'));
    const pending = (txs || []).filter(x => x.term === t && x.status === 'pending' && x.kind === 'deduction');
    const deducted = approved.reduce((s, x) => s + Number(x.amount), 0);
    const pendingDeducted = pending.reduce((s, x) => s + Number(x.amount), 0);
    const remaining = starting - deducted;
    terms.push({
      term: t,
      starting_marks: starting,
      approved_deductions: Number(deducted.toFixed(2)),
      pending_deductions: Number(pendingDeducted.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
      percentage: starting > 0 ? Number(((remaining / starting) * 100).toFixed(2)) : null,
      has_activity: approved.length + pending.length > 0
    });
  }
  const complete = terms.length === rules.term_count;
  const annual_marks = Number(terms.reduce((s, t) => s + t.remaining, 0).toFixed(2));
  const annual_max = Number(rules.max_annual);
  return {
    rules: { starting_marks: starting, term_count: rules.term_count, max_annual: annual_max, allow_negative: rules.allow_negative },
    terms,
    annual: {
      marks: annual_marks,
      max: annual_max,
      percentage: annual_max > 0 ? Number(((annual_marks / annual_max) * 100).toFixed(2)) : null,
      finalized: false,
      note: 'Calculated from approved deductions so far. Terms with no activity are shown at the full starting marks and are not final.'
    },
    transactions: txs || []
  };
}

// A reported incident records a PENDING deduction so pending cases are visible and
// are clearly distinguished from approved deductions (pending never counts).
export async function createPendingDeduction({ institutionId, personId, incidentId, term, amount, caseNumber }) {
  if (!amount || Number(amount) <= 0) return null;
  const { data: existing } = await adminDb.from('score_transactions').select('id')
    .eq('incident_id', incidentId).in('status', ['pending', 'approved']).eq('kind', 'deduction').maybeSingle();
  if (existing) return existing;
  const { data, error } = await adminDb.from('score_transactions').insert({
    institution_id: institutionId, person_id: personId, incident_id: incidentId,
    term: term || 1, amount: Number(amount), kind: 'deduction', status: 'pending',
    note: `Pending case ${caseNumber || ''}`.trim()
  }).select().single();
  if (error) { console.error('pending deduction failed:', error.message); return null; }
  return data;
}

// Approves the pending deduction for a case, or inserts one when none exists.
// Idempotent: never creates a second approved deduction for the same incident.
export async function applyDeduction({ institutionId, personId, incidentId, term, amount, note, decidedBy }) {
  if (!amount || Number(amount) <= 0) return { skipped: true };
  const { data: all } = await adminDb.from('score_transactions').select('*')
    .eq('incident_id', incidentId).eq('kind', 'deduction').in('status', ['pending', 'approved']);
  const approved = (all || []).find(t => t.status === 'approved');
  if (approved) return { existing: approved };
  const pending = (all || []).find(t => t.status === 'pending');
  if (pending) {
    const { data, error } = await adminDb.from('score_transactions')
      .update({ status: 'approved', amount: Number(amount), note: note || pending.note, decided_by: decidedBy })
      .eq('id', pending.id).select().single();
    if (error) throw new Error('Could not approve the score deduction.');
    return { data, approved_pending: true };
  }
  const { data, error } = await adminDb.from('score_transactions').insert({
    institution_id: institutionId, person_id: personId, incident_id: incidentId,
    term: term || 1, amount: Number(amount), kind: 'deduction', status: 'approved',
    note: note || null, decided_by: decidedBy
  }).select().single();
  if (error) throw new Error('Could not record the score deduction.');
  return { data };
}

// Dismissing a case drops its pending deduction without touching approved history.
export async function cancelPendingDeduction({ incidentId, reason }) {
  const { data: txs } = await adminDb.from('score_transactions').select('*')
    .eq('incident_id', incidentId).eq('status', 'pending').eq('kind', 'deduction');
  for (const tx of txs || []) {
    await adminDb.from('score_transactions').update({ status: 'reversed', note: `${tx.note || ''} Cancelled: ${reason || 'case dismissed'}.`.trim() }).eq('id', tx.id);
  }
  return { cancelled: (txs || []).length };
}

export async function reverseDeduction({ institutionId, incidentId, decidedBy, reason }) {
  const { data: txs } = await adminDb.from('score_transactions').select('*')
    .eq('incident_id', incidentId).eq('status', 'approved').eq('kind', 'deduction');
  if (!txs?.length) return { reversed: 0 };
  for (const tx of txs) {
    await adminDb.from('score_transactions').update({ status: 'reversed' }).eq('id', tx.id);
    await adminDb.from('score_transactions').insert({
      institution_id: tx.institution_id, person_id: tx.person_id, incident_id: tx.incident_id,
      term: tx.term, amount: Number(tx.amount), kind: 'reversal', status: 'approved',
      note: `Reversal of transaction ${tx.id}. ${reason || ''}`.trim(), decided_by: decidedBy
    });
  }
  return { reversed: txs.length };
}
