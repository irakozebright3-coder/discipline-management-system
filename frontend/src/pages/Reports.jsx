import { useEffect, useState } from 'react';
import { useOrg } from '../hooks/useOrg.jsx';
import { getReports, reportsExportUrl, scoresExportUrl, baseUrl } from '../lib/api.js';
import SearchBar from '../components/SearchBar.jsx';
import { Button } from '../components/ui/button.jsx';
import { Select } from '../components/ui/select.jsx';
import { Input } from '../components/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Badge } from '../components/ui/badge.jsx';

const STATUSES = ['submitted', 'under_review', 'awaiting_decision', 'resolved', 'appealed', 'closed'];
const SEVERITIES = ['minor', 'moderate', 'serious', 'not_applicable'];

export default function Reports() {
  const { orgId, organization } = useOrg();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  const params = { search, status: statusFilter || undefined, severity: severityFilter || undefined, from: from || undefined, to: to || undefined };
  const load = async () => {
    try { const res = await getReports(orgId, params); setData(res.data); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { if (orgId) load(); }, [orgId, search, statusFilter, severityFilter, from, to]);

  const download = async (kind) => {
    const { supabase } = await import('../lib/supabase.js');
    const { data: { session } } = await supabase.auth.getSession();
    const url = (kind === 'scores' ? scoresExportUrl : reportsExportUrl)(orgId, params);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
    if (!response.ok) { const b = await response.json().catch(() => ({})); setError(b.error || 'Export failed.'); return; }
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = kind === 'scores' ? 'score-report.csv' : 'case-report.csv';
    a.click(); URL.revokeObjectURL(a.href);
  };

  const summary = data?.summary || {};
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Filter, search and export the discipline record of {organization?.name}.</p>
        </div>
        <div className="flex gap-2">
          <Button disabled={!data} onClick={() => download('cases')}>Export cases CSV</Button>
          <Button variant="outline" disabled={!data} onClick={() => download('scores')}>Export scores CSV</Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search case number, person, description…" ariaLabel="Search reports" className="max-w-sm" />
        <Select className="max-w-[170px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select className="max-w-[160px]" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} aria-label="Filter by severity">
          <option value="">All severities</option>{SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <input type="date" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={from} onChange={e => setFrom(e.target.value)} aria-label="From date" />
        <input type="date" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={to} onChange={e => setTo(e.target.value)} aria-label="To date" />
      </div>
      {!data ? <p className="text-muted-foreground">Loading…</p> : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary">{data.total}</p><p className="text-sm text-muted-foreground">Cases matched</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary">{Object.entries(summary.by_status || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</p><p className="text-sm text-muted-foreground">By status</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary">{Object.entries(summary.by_severity || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</p><p className="text-sm text-muted-foreground">By severity</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-3xl font-bold text-primary">{Object.entries(summary.by_month || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</p><p className="text-sm text-muted-foreground">By month</p></CardContent></Card>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="p-3 font-medium">Case</th><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Person</th>
                <th className="p-3 font-medium">Category</th><th className="p-3 font-medium">Severity</th>
                <th className="p-3 font-medium">Marks</th><th className="p-3 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {(data.rows || []).map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{r.case_number}</td>
                    <td className="p-3">{r.incident_date}</td>
                    <td className="p-3">{r.people?.full_name || '—'}</td>
                    <td className="p-3">{r.category_name || r.incident_categories?.name || '—'}</td>
                    <td className="p-3">{r.severity}</td>
                    <td className="p-3">{r.marks_deducted ?? '—'}</td>
                    <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                  </tr>
                ))}
                {(data.rows || []).length === 0 && <tr><td colSpan="7" className="p-6 text-center text-muted-foreground">No cases match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
