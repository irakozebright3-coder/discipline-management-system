import { useEffect, useState } from 'react';
import { platformGet } from '../../lib/api.js';
import StatCard from '../../components/StatCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Building2, Users as UsersIcon, User, FileWarning, Eye } from 'lucide-react';

export default function OwnerDashboard() {
  const [dash, setDash] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    platformGet('dashboard').then(({ data }) => setDash(data)).catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-destructive" role="alert">{error}</p>;
  if (!dash) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Platform dashboard</h1>
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Organizations" value={dash.counts.organizations} icon={Building2} />
        <StatCard label="Users" value={dash.counts.users} icon={UsersIcon} />
        <StatCard label="People" value={dash.counts.people} icon={User} />
        <StatCard label="Incidents" value={dash.counts.incidents} icon={FileWarning} />
        <StatCard label="Visits" value={dash.counts.visitors} icon={Eye} />
      </div>
      {dash.config && (
        <Card>
          <CardHeader><CardTitle>System</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            <p><span className="text-muted-foreground">Version:</span> {dash.config.system_version}</p>
            <p><span className="text-muted-foreground">Health:</span> <Badge variant="outline">{dash.config.system_health}</Badge></p>
            <p><span className="text-muted-foreground">Maintenance:</span> <Badge variant={dash.config.maintenance_mode ? 'destructive' : 'secondary'}>{dash.config.maintenance_mode ? 'ON' : 'OFF'}</Badge></p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Organizations</CardTitle></CardHeader>
        <CardContent>
          {(dash.organizations || []).length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Name</th><th className="py-2 pr-4 font-medium">Type</th><th className="py-2 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {dash.organizations.map(o => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{o.name}</td><td className="py-2 pr-4">{o.type}</td>
                    <td className="py-2"><Badge variant="outline">{o.suspended ? 'Suspended' : 'Active'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
