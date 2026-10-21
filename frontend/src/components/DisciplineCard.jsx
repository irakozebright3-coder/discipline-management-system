import { HS_MAX, HS_ANNUAL_MAX, termMark, annualScore, annualPercentage, ratingFor } from '../lib/discipline.js';

export default function DisciplineCard({ person }) {
  const terms = [1, 2, 3].map(t => ({ t, mark: termMark(person, t) }));
  const annual = annualScore(person);
  const pct = annualPercentage(person);
  const rating = ratingFor(pct);

  return (
    <div className="card discipline-card">
      <div className="row-between">
        <h3>Discipline card</h3>
        <span className={`pill ${rating.tone}`}>{rating.label}</span>
      </div>
      <div className="term-row">
        {terms.map(tm => (
          <div key={tm.t} className="term">
            <span className="muted">Term {tm.t}</span>
            <strong>{tm.mark} <span className="muted">/ {HS_MAX}</span></strong>
            <div className="bar">
              <div className="bar-fill" style={{ width: Math.min(100, (tm.mark / HS_MAX) * 100) + '%' }}></div>
            </div>
          </div>
        ))}
      </div>
      <div className="annual">
        <div><span className="muted">Annual score</span><strong>{annual} <span className="muted">/ {HS_ANNUAL_MAX}</span></strong></div>
        <div><span className="muted">Annual percentage</span><strong>{pct.toFixed(1)}%</strong></div>
      </div>
    </div>
  );
}
