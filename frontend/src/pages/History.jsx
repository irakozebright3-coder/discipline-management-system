import { useEffect, useState } from 'react';
import { useOrg } from '../hooks/useOrg.jsx';
import { listIncidents } from '../lib/api.js';
import { Input } from '../components/ui/input.jsx';
import { Select } from '../components/ui/select.jsx';
import { Badge } from '../components/ui/badge.jsx';

const STATUSES = ['Reported', 'Under Review', 'Confirmed', 'Resolved', 'Appealed', 'Closed'];

export default function History() {
  const { orgId } = useOrg();
  const [rows, setRows] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-sm text-muted-foreground">Browse the full incident history of your organization.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search person or violation…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search history" />
        <Select className="max-w-[180px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </Select>
        <Select className="max-w-[150px]" value={termFilter} onChange={e => setTermFilter(e.target.value)} aria-label="Filter by term">
          <option value="">All terms</option>
          <option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option>
        </Select>
      </div>
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Person</th><th className="p-3 font-medium">Violation</th>
              <th className="p-3 font-medium">Term</th><th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Marks deducted</th><th className="p-3 font-medium">Remaining</th>
              <th className="p-3 font-medium">Status</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">{r.person_name}</td>
                  <td className="p-3">{r.violation_name || r.reason || '—'}</td>
                  <td className="p-3">{r.term}</td>
                  <td className="p-3">{r.incident_date}</td>
                  <td className="p-3">{r.marks_deducted}</td>
                  <td className="p-3">{r.remaining_marks ?? '—'}</td>
                  <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-muted-foreground">No incidents match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
