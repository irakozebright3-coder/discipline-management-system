import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileWarning, AlertTriangle, ListChecks } from 'lucide-react';
import { useOrg } from '../hooks/useOrg.jsx';
import { getDashboard, listIncidents } from '../lib/api.js';
import StatCard from '../components/StatCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Badge } from '../components/ui/badge.jsx';

export default function Dashboard() {
  const { organization, membership } = useOrg();
  const orgId = organization?.id;
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const [d, i] = await Promise.all([getDashboard(orgId), listIncidents(orgId, { limit: 50 })]);
        if (cancelled) return;
        setStats(d.data); setRecent(i.data);
      } catch (err) { if (!cancelled) setError(err.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  if (!orgId) return <p className="text-muted-foreground">Select an institution first.</p>;
  const needle = search.trim().toLowerCase();
  const rows = (recent || []).filter(i =>
    !needle || [i.case_number, i.person_name, i.category_label, i.description]
      .filter(Boolean).join(' ').toLowerCase().includes(needle));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{organization.name}</h1>
        <p className="text-sm text-muted-foreground">{organization.type} · Your role: <Badge variant="secondary">{membership?.role}</Badge></p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="People" value={stats?.people_total ?? '…'} icon={Users} />
        <StatCard label="Cases on record" value={stats?.incidents_total ?? '…'} icon={FileWarning} />
        <StatCard label="Open cases" value={stats ? stats.open_cases : '…'} icon={AlertTriangle} />
        <StatCard label="Resolved + closed" value={stats ? stats.resolved_cases : '…'} icon={ListChecks} />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent cases</CardTitle>
          <div className="flex items-center gap-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search recent cases…" ariaLabel="Search recent cases" />
            <Link to="/incidents" className="whitespace-nowrap text-sm text-primary hover:underline">All cases →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {!recent ? <p className="text-sm text-muted-foreground">Loading…</p>
            : rows.length === 0 ? <p className="text-sm text-muted-foreground">No matching cases.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Case</th>
                    <th className="py-2 pr-4 font-medium">Date</th><th className="py-2 pr-4 font-medium">Person</th>
                    <th className="py-2 pr-4 font-medium">Category</th><th className="py-2 pr-4 font-medium">Severity</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr></thead>
                  <tbody>
                    {rows.slice(0, 10).map(i => (
                      <tr key={i.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium text-primary">{i.case_number}</td>
                        <td className="py-2 pr-4">{i.incident_date}</td>
                        <td className="py-2 pr-4">{i.person_name || '—'}</td>
                        <td className="py-2 pr-4">{i.category_label || '—'}</td>
                        <td className="py-2 pr-4">{i.severity}</td>
                        <td className="py-2"><Badge variant="outline">{i.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
