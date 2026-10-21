import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileWarning, AlertTriangle, ListChecks } from 'lucide-react';
import { useOrg } from '../hooks/useOrg.jsx';
import { listPersons, listIncidents } from '../lib/api.js';
import StatCard from '../components/StatCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Badge } from '../components/ui/badge.jsx';

export default function Dashboard() {
  const { organization, membership } = useOrg();
  const orgId = organization?.id;
  const [persons, setPersons] = useState(null);
  const [incidents, setIncidents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, i] = await Promise.all([listPersons(orgId), listIncidents(orgId)]);
        if (cancelled) return;
        setPersons(p.data); setIncidents(i.data);
      } catch (err) { if (!cancelled) setError(err.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  if (!orgId) return <p className="text-muted-foreground">Select an organization first.</p>;
  const open = (incidents || []).filter(i => !['Resolved', 'Closed'].includes(i.status)).length;
  const serious = (incidents || []).filter(i => i.severity === 'Serious').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{organization.name}</h1>
        <p className="text-sm text-muted-foreground">{organization.type} · Your role: <Badge variant="secondary">{membership.role}</Badge></p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="People" value={persons?.length ?? '…'} icon={Users} />
        <StatCard label="Incidents on record" value={incidents?.length ?? '…'} icon={FileWarning} />
        <StatCard label="Open incidents" value={persons ? open : '…'} icon={AlertTriangle} />
        <StatCard label="Serious incidents" value={persons ? serious : '…'} icon={ListChecks} />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent incidents</CardTitle>
          <Link to="/incidents" className="text-sm text-primary hover:underline">Go to incidents →</Link>
        </CardHeader>
        <CardContent>
          {!incidents ? <p className="text-sm text-muted-foreground">Loading…</p>
            : incidents.length === 0 ? <p className="text-sm text-muted-foreground">No incidents recorded yet.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th><th className="py-2 pr-4 font-medium">Person</th>
                    <th className="py-2 pr-4 font-medium">Violation</th><th className="py-2 pr-4 font-medium">Severity</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr></thead>
                  <tbody>
                    {incidents.slice(0, 8).map(i => (
                      <tr key={i.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{i.incident_date}</td>
                        <td className="py-2 pr-4">{i.persons?.full_name || '—'}</td>
                        <td className="py-2 pr-4">{i.violation_name || '—'}</td>
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
