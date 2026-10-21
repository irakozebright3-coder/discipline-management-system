import { useEffect, useState } from 'react';
import { useOrg } from '../hooks/useOrg.jsx';
import { listAuditLogs } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Badge } from '../components/ui/badge.jsx';

export default function Settings() {
  const { orgId, organization, membership } = useOrg();
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    listAuditLogs(orgId).then(({ data }) => { if (!cancelled) setLogs(data); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [orgId]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Card>
        <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Name:</span> {organization?.name}</p>
          <p><span className="text-muted-foreground">Type:</span> {organization?.type} ({TRACK_LABELS[organization?.track] || organization?.track})</p>
          <p><span className="text-muted-foreground">Your role:</span> {membership?.role}</p>
          <p><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{organization?.suspended ? 'Suspended' : 'Active'}</Badge></p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Audit activity</CardTitle></CardHeader>
        <CardContent>
          {logs === null ? <p className="text-sm text-muted-foreground">Loading…</p>
            : logs.length === 0 ? <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">When</th><th className="py-2 pr-4 font-medium">Action</th>
                    <th className="py-2 pr-4 font-medium">Entity</th><th className="py-2 font-medium">Details</th>
                  </tr></thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-4"><Badge variant="outline">{l.action}</Badge></td>
                        <td className="py-2 pr-4">{l.entity_type}</td>
                        <td className="max-w-[240px] truncate py-2 text-muted-foreground">{JSON.stringify(l.details || {})}</td>
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
