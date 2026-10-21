import { useEffect, useState } from 'react';
import { listIncidents } from '../lib/api.js';

const STATUSES = ['Reported', 'Under Review', 'Confirmed', 'Resolved', 'Appealed', 'Closed'];

export default function HistoryView({ orgId }) {
  const [rows, setRows] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setRows(null); setError('');
    (async () => {
      try {
        const { data } = await listIncidents(orgId);
        if (!cancelled) setRows(data);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const filtered = (rows || []).filter(r =>
    (!statusFilter || r.status === statusFilter) &&
    (!termFilter || r.term === termFilter) &&
    (r.person_name + ' ' + r.violation_name).toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="view">
      <h2 className="page-title">History</h2>
      <p className="muted">Browse the full incident history of your organization.</p>
      {error && <p className="error" role="alert">{error}</p>}

      {rows ? (
        <>
          <div className="filter-row">
            <input className="input search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search person or violation…" aria-label="Search history" />
            <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="input" value={termFilter} onChange={e => setTermFilter(e.target.value)} aria-label="Filter by term">
              <option value="">All terms</option>
              <option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <p className="muted">No incidents match these filters.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Person</th><th>Violation</th><th>Term</th><th>Date</th><th>Marks deducted</th><th>Remaining</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td>{r.person_name}</td>
                      <td>{r.violation_name || r.reason || '—'}</td>
                      <td>{r.term}</td>
                      <td>{r.incident_date}</td>
                      <td>{r.marks_deducted}</td>
                      <td>{r.remaining_marks ?? '—'}</td>
                      <td><span className="pill">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </section>
  );
}
