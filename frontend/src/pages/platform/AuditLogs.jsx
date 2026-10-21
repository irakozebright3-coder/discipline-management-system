import { useEffect, useState } from 'react';
import { Tabs } from '../../components/ui/tabs.jsx';
import { platformGet } from '../../lib/api.js';
import { Badge } from '../../components/ui/badge.jsx';

export default function AuditLogs() {
  const [tab, setTab] = useState('Platform');
  const [plogs, setPlogs] = useState(null);
  const [ologs, setOlogs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    platformGet('audit-logs').then(({ data }) => setPlogs(data)).catch(e => setError(e.message));
    platformGet('org-audit-logs').then(({ data }) => setOlogs(data)).catch(e => setError(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit logs</h1>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Tabs tabs={['Platform', 'Organizations']} active={tab} onChange={setTab} />
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="p-3 font-medium">When</th><th className="p-3 font-medium">Action</th>
            <th className="p-3 font-medium">Target</th><th className="p-3 font-medium">User</th>
          </tr></thead>
          <tbody>
            {(tab === 'Platform' ? plogs : ologs) === null ? (
              <tr><td colSpan="4" className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : (tab === 'Platform' ? plogs : ologs).length === 0 ? (
              <tr><td colSpan="4" className="p-6 text-center text-muted-foreground">No entries.</td></tr>
            ) : (tab === 'Platform' ? plogs : ologs).map(l => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="p-3">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-3"><Badge variant="outline">{l.action}</Badge></td>
                <td className="p-3">{l.target || l.entity_type}</td>
                <td className="p-3">{l.user_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
