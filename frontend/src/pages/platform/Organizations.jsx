import { useEffect, useState } from 'react';
import { platformGet, platformPatch } from '../../lib/api.js';
import { Badge } from '../../components/ui/badge.jsx';
import { Button } from '../../components/ui/button.jsx';

export default function Organizations() {
  const [orgs, setOrgs] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try { const { data } = await platformGet('dashboard'); setOrgs(data.organizations || []); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const toggleSuspend = async (o) => {
    setError('');
    try {
      await platformPatch(`organizations/${o.id}`, { suspended: !o.suspended });
      await load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Organizations</h1>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {!orgs ? <p className="text-muted-foreground">Loading…</p> : orgs.length === 0 ? <p className="text-muted-foreground">No organizations yet.</p> : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Status</th><th className="p-3 font-medium"></th>
            </tr></thead>
            <tbody>
              {orgs.map(o => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{o.name}</td>
                  <td className="p-3">{o.type}</td>
                  <td className="p-3"><Badge variant={o.suspended ? 'destructive' : 'secondary'}>{o.suspended ? 'Suspended' : 'Active'}</Badge></td>
                  <td className="p-3"><Button variant="outline" size="sm" onClick={() => toggleSuspend(o)}>{o.suspended ? 'Unsuspend' : 'Suspend'}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
