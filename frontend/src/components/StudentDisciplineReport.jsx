import { Printer, MinusCircle } from 'lucide-react';
import DisciplineGauge from './DisciplineGauge.jsx';
import { Button } from './ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx';

// Mirrors the server's level bands so this page needs no extra request.
export function levelOf(pct) {
  if (typeof pct !== 'number') return { label: 'No data', tone: 'muted' };
  if (pct >= 90) return { label: 'Excellent', tone: 'good' };
  if (pct >= 75) return { label: 'Good', tone: 'ok' };
  if (pct >= 60) return { label: 'Fair', tone: 'warn' };
  if (pct >= 40) return { label: 'Poor', tone: 'bad' };
  return { label: 'Critical', tone: 'bad' };
}

const ADVICE = {
  Excellent: 'Outstanding conduct. Keep it up.',
  Good: 'Good conduct overall, with a few marks lost.',
  Fair: 'Conduct needs attention. A conversation with the student and guardian is advised.',
  Poor: 'Serious loss of conduct marks. Counselling and a guardian meeting are recommended.',
  Critical: 'Conduct is at a critical level. Immediate intervention is recommended.',
  'No data': 'No conduct information yet.'
};

const KIND_LABEL = { deduction: 'Deduction', adjustment: 'Adjustment', reversal: 'Restored' };

export default function StudentDisciplineReport({ person, scores, unitNames, canDeduct, onDeduct }) {
  const pct = scores?.annual?.percentage;
  const level = levelOf(pct);
  const history = (scores?.transactions || []).filter(t => t.status !== 'reversed' || t.kind === 'deduction').slice().reverse();

  return (
    <Card className="dm-report">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Discipline report</CardTitle>
        <div className="flex gap-2 print:hidden">
          {canDeduct && <Button size="sm" variant="destructive" onClick={onDeduct}><MinusCircle size={14} /> Deduct marks</Button>}
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer size={14} /> Print</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="hidden print:block">
          <p className="text-lg font-bold">{person.full_name} · {person.person_id}</p>
          <p className="text-sm">{[unitNames.class, unitNames.trade].filter(Boolean).join(' · ')} · Printed {new Date().toLocaleDateString()}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6">
          <DisciplineGauge percentage={pct} level={level} label="Overall discipline" size={140} />
          <div className="min-w-[14rem] flex-1 space-y-1">
            <p className="text-sm"><span className="text-muted-foreground">Annual marks:</span> <b className="tabular-nums">{scores?.annual?.marks}</b> / {scores?.annual?.max}</p>
            <p className="text-sm text-muted-foreground">{ADVICE[level.label]}</p>
            <p className="text-xs text-muted-foreground">{scores?.annual?.note}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(scores?.terms || []).map(t => {
            const lv = levelOf(t.percentage);
            return (
              <div key={t.term} className="rounded-lg border p-3">
                <div className="flex items-center justify-between"><p className="text-sm font-medium">Term {t.term}</p><span className="text-xs text-muted-foreground">{lv.label}</span></div>
                <p className="text-2xl font-bold tabular-nums">{t.remaining}<span className="text-sm font-normal text-muted-foreground"> / {t.starting_marks}</span></p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, t.percentage ?? 0))}%` }} /></div>
                <p className="mt-1 text-xs text-muted-foreground">{t.approved_deductions} deducted{t.pending_deductions > 0 ? ` · ${t.pending_deductions} pending` : ''}</p>
              </div>
            );
          })}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">How it has gone</h3>
          {history.length === 0 ? <p className="text-sm text-muted-foreground">No marks have been deducted. A clean record so far.</p> : (
            <ol className="space-y-2 border-l pl-4">
              {history.map(t => (
                <li key={t.id} className="relative text-sm">
                  <span className={`absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ${t.kind === 'reversal' ? 'bg-emerald-400' : t.status === 'pending' ? 'bg-amber-400' : 'bg-red-400'}`} />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span><b>{t.kind === 'reversal' ? '+' : '−'}{t.amount}</b> · Term {t.term} · {KIND_LABEL[t.kind] || t.kind}{t.status === 'pending' ? ' (pending)' : ''}</span>
                    <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.case?.case_number ? `${t.case.case_number}${t.case.category_name ? ' · ' + t.case.category_name : ''}` : 'Recorded by staff'}{t.note ? ` · ${t.note}` : ''}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
