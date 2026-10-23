import { useEffect, useState } from 'react';
import { platformGet } from '../../lib/api.js';
import SearchBar from '../../components/SearchBar.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export default function AuditLogs() {
  const [tab, setTab] = useState('platform');
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async (tab, q) => {
    setRows(null);
    try {
      const path = tab === 'platform' ? 'audit-logs' : 'org-audit-logs';
      const { data } = await platformGet(`${path}${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setRows(data);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(tab, ''); }, [tab]);
  useEffect(() => { if (rows) load(tab, search); }, [search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit logs</h1>
        <p className="text-sm text-muted-foreground">Platform actions and every institution's own history.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border">
          <button className={`px-4 py-2 text-sm ${tab === 'platform' ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setTab('platform')}>Platform</button>
          <button className={`px-4 py-2 text-sm ${tab === 'institutions' ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setTab('institutions')}>Institutions</button>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search action, actor, details…" ariaLabel="Search audit logs" className="max-w-sm" />
      </div>
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">When</th><th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium">{tab === 'platform' ? 'Target' : 'Institution'}</th>
              <th className="p-3 font-medium">Actor</th><th className="p-3 font-medium">Details</th>
            </tr></thead>
            <tbody>
              {rows.map(l => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3"><Badge variant="outline">{l.action}</Badge></td>
                  <td className="p-3">{tab === 'platform' ? (l.target || '—') : (l.institutions?.name || '—')}</td>
                  <td className="p-3">{l.user_name || l.actor_name || '—'}</td>
                  <td className="max-w-md truncate p-3 text-muted-foreground">{typeof l.details === 'string' ? l.details : JSON.stringify(l.details || {})}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-muted-foreground">No entries match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
