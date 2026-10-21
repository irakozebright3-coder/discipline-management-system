import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx';
import { Badge } from './ui/badge.jsx';
import { HS_MAX, HS_ANNUAL_MAX, termMark, annualScore, annualPercentage, ratingFor } from '../lib/discipline.js';

export default function DisciplineCard({ person }) {
  const terms = [1, 2, 3].map(t => ({ t, mark: termMark(person, t) }));
  const annual = annualScore(person);
  const pct = annualPercentage(person);
  const rating = ratingFor(pct);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Discipline card</CardTitle>
        <Badge variant={rating.tone ? undefined : 'secondary'} className={rating.tone}>{rating.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {terms.map(tm => (
            <div key={tm.t} className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Term {tm.t}</p>
              <p className="font-semibold">{tm.mark} <span className="text-xs text-muted-foreground">/ {HS_MAX}</span></p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: Math.min(100, (tm.mark / HS_MAX) * 100) + '%' }}></div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Annual score</p>
            <p className="text-xl font-bold">{annual} <span className="text-sm text-muted-foreground">/ {HS_ANNUAL_MAX}</span></p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Annual percentage</p>
            <p className="text-xl font-bold">{pct.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
