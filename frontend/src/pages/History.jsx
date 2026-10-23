import { useEffect, useState } from 'react';
import { useOrg } from '../hooks/useOrg.jsx';
import { listAuditLogs } from '../lib/api.js';
import SearchBar from '../components/SearchBar.jsx';
import { Select } from '../components/ui/select.jsx';
import { Badge } from '../components/ui/badge.jsx';

const ENTITIES = ['person', 'incident', 'incident_category', 'org_unit', 'membership', 'invitation', 'score_transaction', 'institution'];

export default function History() {
  const { orgId } = useOrg();
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  const load = async (p = 1) => {
    try {
      const res = await listAuditLogs(orgId, {
        search, entity_type: entityFilter || undefined,
        from: from || undefined, to: to || undefined, page: p, limit: 25
      });
      setRows(res.data); setTotal(res.total); setPage(p);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { if (orgId) load(1); }, [orgId, search, entityFilter, from, to]);
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-sm text-muted-foreground">Every recorded action in this institution, with who did it and when.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search action, actor, details…" ariaLabel="Search audit history" className="max-w-sm" />
        <Select className="max-w-[190px]" value={entityFilter} onChange={e => setEntityFilter(e.target.value)} aria-label="Filter by entity">
          <option value="">All entities</option>
          {ENTITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <input type="date" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={from} onChange={e => setFrom(e.target.value)} aria-label="From date" />
        <input type="date" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={to} onChange={e => setTo(e.target.value)} aria-label="To date" />
        <span className="ml-auto text-sm text-muted-foreground">{total} {total === 1 ? 'entry' : 'entries'}</span>
      </div>
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">When</th><th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium">Entity</th><th className="p-3 font-medium">Actor</th><th className="p-3 font-medium">Details</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3"><Badge variant="outline">{r.action}</Badge></td>
                  <td className="p-3">{r.entity_type}</td>
                  <td className="p-3">{r.actor_name || r.actor_id?.slice(0, 8) || 'system'}</td>
                  <td className="max-w-md truncate p-3 text-muted-foreground">{typeof r.details === 'string' ? r.details : JSON.stringify(r.details || {})}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-muted-foreground">No history entries match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button className="rounded-md border px-3 py-1.5 disabled:opacity-50" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <button className="rounded-md border px-3 py-1.5 disabled:opacity-50" disabled={page >= pages} onClick={() => load(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
