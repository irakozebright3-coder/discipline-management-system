import { useEffect, useState } from 'react';
import { useOrg } from '../hooks/useOrg.jsx';
import { listIncidents, listPersons } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import { Button } from '../components/ui/button.jsx';
import { Select } from '../components/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import StatCard from '../components/StatCard.jsx';

export default function Reports() {
  const { orgId, organization } = useOrg();
  const track = organization?.track || 'HIGH_SCHOOL';
  const [incidents, setIncidents] = useState(null);
  const [people, setPeople] = useState([]);
  const [termFilter, setTermFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const [i, p] = await Promise.all([listIncidents(orgId), listPersons(orgId)]);
        if (cancelled) return;
        setIncidents(i.data || []); setPeople(p.data || []);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const filtered = (incidents || []).filter(r => !termFilter || r.term === termFilter);
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

  const exportCsv = () => {
    const rows = [['Person', 'Violation', 'Term', 'Date', 'Marks deducted', 'Remaining', 'Status', 'Confirmed']];
    for (const r of filtered) {
      rows.push([r.person_name, r.violation_name || r.reason || '', r.term, r.incident_date,
        r.marks_deducted, r.remaining_marks ?? '', r.status, r.confirmed ? 'Yes' : 'No']);
    }
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `discipline-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">{TRACK_LABELS[track]} disciplinary report.</p>
        </div>
        <Button disabled={!incidents} onClick={exportCsv}>Export CSV</Button>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Select className="max-w-[180px]" value={termFilter} onChange={e => setTermFilter(e.target.value)} aria-label="Report term">
        <option value="">All terms</option>
        <option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option>
      </Select>
      {incidents ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Incidents" value={filtered.length} />
            <StatCard label="Confirmed" value={confirmed} />
            <StatCard label="Marks deducted" value={totalDeducted} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">By severity</CardTitle></CardHeader>
              <CardContent>
                {Object.keys(bySeverity).length === 0 ? <p className="text-sm text-muted-foreground">No incidents in this period.</p>
                  : Object.entries(bySeverity).map(([sev, count]) => (
                    <div key={sev} className="flex items-center justify-between py-1 text-sm">
                      <span>{sev}</span><span className="font-semibold">{count}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Top violations</CardTitle></CardHeader>
              <CardContent>
                {topViolations.length === 0 ? <p className="text-sm text-muted-foreground">No violations recorded.</p>
                  : topViolations.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between py-1 text-sm">
                      <span>{name}</span><span className="font-semibold">{count}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
          {watchlist.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Discipline watchlist (lowest annual scores)</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Student</th><th className="py-2 font-medium">Annual score</th>
                  </tr></thead>
                  <tbody>
                    {watchlist.map(p => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{p.full_name}</td><td className="py-2">{p.annual} / 120</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      ) : <p className="text-muted-foreground">Loading…</p>}
    </div>
  );
}
