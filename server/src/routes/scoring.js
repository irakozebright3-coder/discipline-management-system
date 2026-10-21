import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership, isAdmin } from '../middleware/auth.js';
import { audit, zodMessage } from '../lib.js';
import { personScores, scoringRules, reverseDeduction } from '../services/scoring.js';

const router = Router();

router.get('/person/:personId', requireAuth, requireMembership(), async (req, res) => {
  const { data: person } = await adminDb.from('people').select('id, full_name, person_id')
    .eq('id', req.params.personId).eq('institution_id', req.institutionId).maybeSingle();
  if (!person) return res.status(404).json({ error: 'Person not found in this institution.' });
  const scores = await personScores(req.institutionId, person.id);
  res.json({ data: { person, ...scores } });
});

router.get('/rules', requireAuth, requireMembership(), async (req, res) => {
  const [rules, all] = await Promise.all([
    scoringRules(req.institutionId),
    adminDb.from('scoring_rules').select('*').eq('institution_id', req.institutionId)
  ]);
  res.json({ data: { active: rules, all: all.data || [] } });
});

// Authorised manual adjustment (documented, audited, never silently edits history).
const adjustSchema = z.object({
  institution_id: z.string().uuid(),
  person_id: z.string().uuid(),
  term: z.number().int().min(1).max(3),
  amount: z.number().min(0).max(1000),
  note: z.string().min(5).max(1000)
});

router.post('/adjust', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid adjustment.') });
  const d = parsed.data;
  const { data: personRow } = await adminDb.from('people').select('id, full_name').eq('id', d.person_id).eq('institution_id', req.institutionId).maybeSingle();
  if (!personRow) return res.status(404).json({ error: 'Person not found in this institution.' });
  const rules = await scoringRules(req.institutionId);
  const scores = await personScores(req.institutionId, d.person_id);
  const term = scores.terms.find(t => t.term === d.term);
  if (term && term.remaining - d.amount < 0 && !rules.allow_negative) {
    return res.status(400).json({ error: `This deduction would push term ${d.term} below zero (${term.remaining} remaining). Record a documented exception in your policy instead.` });
  }
  const { data, error } = await adminDb.from('score_transactions').insert({
    institution_id: req.institutionId, person_id: d.person_id, term: d.term,
    amount: d.amount, kind: 'adjustment', status: 'approved', note: d.note, decided_by: req.user.id
  }).select().single();
  if (error) return res.status(400).json({ error: 'Could not record the adjustment.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'score.adjust', 'score_transaction', data.id, { person_id: d.person_id, term: d.term, amount: d.amount, note: d.note });
  res.status(201).json({ data });
});

router.post('/reverse/:transactionId', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const { data: tx } = await adminDb.from('score_transactions').select('*')
    .eq('id', req.params.transactionId).eq('institution_id', req.institutionId).maybeSingle();
  if (!tx) return res.status(404).json({ error: 'Transaction not found in this institution.' });
  if (tx.status !== 'approved') return res.status(400).json({ error: `Only approved transactions can be reversed (this one is ${tx.status}).` });
  await adminDb.from('score_transactions').update({ status: 'reversed' }).eq('id', tx.id);
  await adminDb.from('score_transactions').insert({
    institution_id: tx.institution_id, person_id: tx.person_id, incident_id: tx.incident_id, term: tx.term,
    amount: Number(tx.amount), kind: 'reversal', status: 'approved',
    note: `Reversal of transaction ${tx.id}.`, decided_by: req.user.id
  });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'score.reverse', 'score_transaction', tx.id, { amount: tx.amount, term: tx.term });
  res.json({ data: { reversed: true } });
});

export default router;
