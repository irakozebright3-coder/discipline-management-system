import { useEffect, useRef, useState } from 'react';
import { deductMarks } from '../lib/api.js';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';

const QUICK = [1, 2, 3, 5];

// High School only. The caller decides whether to show it; the server enforces it.
export default function DeductMarksDialog({ orgId, student, rules, defaultTerm = 1, onClose, onDone }) {
  const [term, setTerm] = useState(defaultTerm);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const termInfo = student.terms?.find(t => t.term === Number(term));
  const n = Number(amount);
  const after = termInfo && n > 0 ? Number((termInfo.remaining - n).toFixed(2)) : null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!(n > 0)) return setError('Enter how many marks to deduct.');
    if (reason.trim().length < 5) return setError('Give a short reason (at least 5 characters).');
    setBusy(true);
    try {
      const res = await deductMarks({ institution_id: orgId, person_id: student.id, term: Number(term), amount: n, reason: reason.trim() });
      onDone(res.data);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="deduct-title">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" tabIndex={-1} />
      <form onSubmit={submit} className="relative z-10 w-full max-w-md space-y-4 rounded-xl border bg-card p-5 shadow-2xl">
        <div>
          <h2 id="deduct-title" className="text-lg font-bold">Deduct marks</h2>
          <p className="text-sm text-muted-foreground">{student.full_name} · {student.person_id}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(t => {
            const info = student.terms?.find(x => x.term === t);
            return (
              <button key={t} type="button" onClick={() => setTerm(t)} aria-pressed={Number(term) === t}
                className={`rounded-lg border p-2 text-left transition-colors ${Number(term) === t ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}>
                <span className="block text-xs text-muted-foreground">Term {t}</span>
                <span className="text-lg font-bold tabular-nums">{info?.remaining ?? rules?.starting_marks ?? 40}</span>
                <span className="text-xs text-muted-foreground"> / {rules?.starting_marks ?? 40}</span>
              </button>
            );
          })}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deduct-amount">Marks to deduct</Label>
          <div className="flex gap-2">
            <Input ref={firstRef} id="deduct-amount" type="number" min="0.5" step="0.5" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 2" className="w-28" />
            {QUICK.map(q => <Button key={q} type="button" variant="outline" size="sm" onClick={() => setAmount(String(q))}>−{q}</Button>)}
          </div>
          {after !== null && <p className={`text-xs ${after < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>Term {term} would go from {termInfo.remaining} to {after}.</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deduct-reason">Reason</Label>
          <textarea id="deduct-reason" value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={500} placeholder="What happened? This is saved in the student's record and the audit history."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Deduct marks'}</Button>
        </div>
      </form>
    </div>
  );
}
