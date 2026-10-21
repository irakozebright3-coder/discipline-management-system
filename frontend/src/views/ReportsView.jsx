import { useEffect, useState } from 'react';
import { listIncidents, listPersons } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import LiquidButton from '../components/LiquidButton.jsx';

export default function ReportsView({ orgId, track }) {
  const [incidents, setIncidents] = useState(null);
  const [people, setPeople] = useState([]);
  const [termFilter, setTermFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setIncidents(null); setError('');
    (async () => {
      try {
        const [i, p] = await Promise.all([listIncidents(orgId), listPersons(orgId)]);
        if (cancelled) return;
        setIncidents(i.data || []);
        setPeople(p.data || []);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const filtered = (incidents || []).filter(r => !termFilter || r.term === termFilter);
  const totalIncidents = filtered.length;
  const confirmed = filtered.filter(r => r.confirmed).length;
  const totalDeducted = filtered.reduce((s, r) => s + Number(r.marks_deducted || 0), 0);
  const bySeverity = {};
  for (const r of filtered) bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
  const topViolations = Object.entries(
    filtered.reduce((counts, r) => {
      const key = r.violation_name || r.reason || 'Other';
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const watchlist = track === 'HIGH_SCHOOL'
    ? people.map(p => ({ ...p, annual: Number(p.term1_marks ?? 40) + Number(p.term2_marks ?? 40) + Number(p.term3_marks ?? 40) }))
        .sort((a, b) => a.annual - b.annual).slice(0, 10)
    : [];

  function exportCsv() {
    const rows = [['Person', 'Violation', 'Term', 'Date', 'Marks deducted', 'Remaining', 'Status', 'Confirmed']];
    for (const r of filtered) {
      rows.push([r.person_name, r.violation_name || r.reason || '', r.term, r.incident_date,
        r.marks_deducted, r.remaining_marks ?? '', r.status, r.confirmed ? 'Yes' : 'No']);
    }
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `discipline-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="view">
      <div className="row-between">
        <h2 className="page-title">Reports</h2>
        <LiquidButton disabled={!incidents} onClick={exportCsv}>Export CSV</LiquidButton>
      </div>
      <p className="muted">{TRACK_LABELS[track]} disciplinary report.</p>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="filter-row">
        <select className="input" value={termFilter} onChange={e => setTermFilter(e.target.value)} aria-label="Report term">
          <option value="">All terms</option>
          <option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option>
        </select>
      </div>

      {incidents ? (
        <>
          <div className="stats-row">
            <div className="card stat"><span className="muted">Incidents</span><strong>{totalIncidents}</strong></div>
            <div className="card stat"><span className="muted">Confirmed</span><strong>{confirmed}</strong></div>
            <div className="card stat"><span className="muted">Marks deducted</span><strong>{totalDeducted}</strong></div>
          </div>

          <div className="card">
            <h3>By severity</h3>
            {Object.keys(bySeverity).length === 0 ? (
              <p className="muted">No incidents in this period.</p>
            ) : (
              Object.entries(bySeverity).map(([sev, count]) => (
                <p key={sev}><span className="pill">{sev}</span> {count}</p>
              ))
            )}
          </div>

          <div className="card">
            <h3>Top violations</h3>
            {topViolations.length === 0 ? (
              <p className="muted">No violations recorded.</p>
            ) : (
              topViolations.map(([name, count]) => <p key={name}>{name} — {count}</p>)
            )}
          </div>

          {watchlist.length > 0 && (
            <div className="card">
              <h3>Discipline watchlist (lowest annual scores)</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Student</th><th>Annual score</th></tr></thead>
                  <tbody>
                    {watchlist.map(p => <tr key={p.id}><td>{p.full_name}</td><td>{p.annual} / 120</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </section>
  );
}
