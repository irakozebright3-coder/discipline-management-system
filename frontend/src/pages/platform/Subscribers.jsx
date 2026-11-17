import { useEffect, useState } from 'react';
import { Download, Mail, Phone, Trash2, Copy } from 'lucide-react';
import { platformGet, platformDelete } from '../../lib/api.js';
import SearchBar from '../../components/SearchBar.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Card, CardContent } from '../../components/ui/card.jsx';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function Subscribers() {
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (q = '') => {
    try {
      const r = await platformGet(`subscribers${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setRows(r.data); setCounts(r.counts); setError('');
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(''); }, []);
  useEffect(() => { if (rows) load(search); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = (rows || []).filter(r => r.status === 'active');
  const exportCsv = () => {
    const lines = ['contact,type,status,subscribed_on', ...(rows || []).map(r => [r.contact, r.contact_type, r.status, new Date(r.created_at).toISOString().slice(0, 10)].map(csvCell).join(','))];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `subscribers-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  const copy = async (type) => {
    const list = active.filter(r => r.contact_type === type).map(r => r.contact).join(type === 'email' ? ', ' : '\n');
    try { await navigator.clipboard.writeText(list); setNotice(`Copied ${active.filter(r => r.contact_type === type).length} ${type === 'email' ? 'email addresses' : 'phone numbers'}.`); }
    catch { setError('Could not copy. Use Export CSV instead.'); }
  };
  const remove = async () => {
    setBusy(true);
    try { await platformDelete(`subscribers/${target.id}`); setRows(r => r.filter(x => x.id !== target.id)); setNotice('Subscriber removed.'); setTarget(null); load(search); }
    catch (e) { setError(e.message); setTarget(null); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Subscribers</h1>
          <p className="text-sm text-muted-foreground">People who asked to hear about new updates from the founder.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => copy('email')} disabled={!counts?.emails}><Copy size={14} /> Copy emails</Button>
          <Button variant="outline" size="sm" onClick={() => copy('phone')} disabled={!counts?.phones}><Copy size={14} /> Copy phones</Button>
          <Button size="sm" onClick={exportCsv} disabled={!rows?.length}><Download size={14} /> Export CSV</Button>
        </div>
      </div>
      {counts && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold tabular-nums">{counts.active}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail size={12} /> Emails</p><p className="text-2xl font-bold tabular-nums">{counts.emails}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone size={12} /> Phone numbers</p><p className="text-2xl font-bold tabular-nums">{counts.phones}</p></CardContent></Card>
        </div>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300" role="status">{notice}</p>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search email or phone…" ariaLabel="Search subscribers" className="max-w-sm" />
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Contact</th><th className="p-3 font-medium">Type</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Subscribed</th><th className="p-3 font-medium text-right">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.contact}</td>
                  <td className="p-3"><span className="inline-flex items-center gap-1.5 capitalize">{r.contact_type === 'email' ? <Mail size={13} /> : <Phone size={13} />}{r.contact_type}</span></td>
                  <td className="p-3"><Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge></td>
                  <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right"><Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setTarget(r)} aria-label={`Remove ${r.contact}`}><Trash2 size={14} /></Button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">{search ? 'No subscribers match.' : 'No subscribers yet. They appear here when visitors use the subscribe bar on your landing page.'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {target && <ConfirmDialog title="Remove this subscriber?" confirmLabel="Remove" busy={busy} onCancel={() => setTarget(null)} onConfirm={remove}><p><b className="text-foreground">{target.contact}</b> will stop being on your update list.</p></ConfirmDialog>}
    </div>
  );
}
