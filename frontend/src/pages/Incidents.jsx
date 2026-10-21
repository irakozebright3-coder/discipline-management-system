import { useEffect, useState } from 'react';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import { listIncidents, createIncident, updateIncident, deleteIncident, listPersons, listViolations } from '../lib/api.js';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Select } from '../components/ui/select.jsx';
import { Textarea } from '../components/ui/textarea.jsx';
import { Label } from '../components/ui/label.jsx';
import { Badge } from '../components/ui/badge.jsx';

const STATUSES = ['Reported', 'Under Review', 'Confirmed', 'Resolved', 'Appealed', 'Closed'];
const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'N/A'];

export default function Incidents() {
  const { orgId, organization } = useOrg();
  const { isAdmin, canWrite } = useRole();
  const [rows, setRows] = useState(null);
  const [persons, setPersons] = useState([]);
  const [violations, setViolations] = useState([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ person_id: '', violation_id: '', incident_date: '', severity: 'Minor', description: '', location: '', reason: '', marks_deducted: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const reload = async () => setRows((await listIncidents(orgId)).data);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const [i, p, v] = await Promise.all([listIncidents(orgId), listPersons(orgId), listViolations(orgId)]);
        if (cancelled) return;
        setRows(i.data); setPersons(p.data); setViolations(v.data);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const addIncident = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { organization_id: orgId, track: organization?.track || 'HIGH_SCHOOL',
        person_id: form.person_id, incident_date: form.incident_date, severity: form.severity };
      if (form.violation_id) payload.violation_id = form.violation_id;
      if (form.marks_deducted !== '') payload.marks_deducted = Number(form.marks_deducted);
      for (const k of ['description', 'location', 'reason']) if (form[k]) payload[k] = form[k];
      await createIncident(payload);
      setAdding(false); setNotice('Incident recorded.');
      setForm({ person_id: '', violation_id: '', incident_date: '', severity: 'Minor', description: '', location: '', reason: '', marks_deducted: '' });
      await reload();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const changeStatus = async (i, ev) => {
    setError(''); setNotice('');
    try { await updateIncident(i.id, { status: ev.target.value }, orgId); setNotice('Status updated.'); await reload(); }
    catch (err) { setError(err.message); }
  };

  const remove = async (i) => {
    if (!window.confirm('Delete this incident record? This cannot be undone.')) return;
    setError(''); setNotice('');
    try { await deleteIncident(i.id, orgId); setNotice('Incident deleted.'); await reload(); }
    catch (err) { setError(err.message); }
  };

  const filtered = filterStatus ? (rows || []).filter(i => i.status === filterStatus) : (rows || []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incidents</h1>
        {canWrite && <Button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Record incident'}</Button>}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}

      {adding && (
        <form onSubmit={addIncident} className="grid gap-4 rounded-lg border bg-card p-6 shadow-sm md:grid-cols-2">
          <div className="space-y-1.5"><Label>Person</Label>
            <Select required value={form.person_id} onChange={e => set('person_id', e.target.value)}>
              <option value="">Select person…</option>
              {persons.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.person_id})</option>)}
            </Select></div>
          <div className="space-y-1.5"><Label>Violation type (optional)</Label>
            <Select value={form.violation_id} onChange={e => set('violation_id', e.target.value)}>
              <option value="">None</option>
              {violations.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select></div>
          <div className="space-y-1.5"><Label>Date</Label>
            <Input type="date" required value={form.incident_date} onChange={e => set('incident_date', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Severity</Label>
            <Select value={form.severity} onChange={e => set('severity', e.target.value)}>
              {SEVERITIES.map(s => <option key={s}>{s}</option>)}
            </Select></div>
          <div className="space-y-1.5"><Label>Location (optional)</Label>
            <Input value={form.location} onChange={e => set('location', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Reason (optional)</Label>
            <Input value={form.reason} onChange={e => set('reason', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Marks deducted</Label>
            <Input type="number" min="0" step="0.5" value={form.marks_deducted} onChange={e => set('marks_deducted', e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What happened…" /></div>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save incident'}</Button>
          </div>
        </form>
      )}

      <Select className="max-w-[200px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status">
        <option value="">All statuses</option>
        {STATUSES.map(s => <option key={s}>{s}</option>)}
      </Select>

      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Person</th>
              <th className="p-3 font-medium">Violation</th><th className="p-3 font-medium">Severity</th>
              <th className="p-3 font-medium">Marks</th><th className="p-3 font-medium">Status</th>
              {canWrite && <th className="p-3 font-medium"></th>}
            </tr></thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">{i.incident_date}</td>
                  <td className="p-3">{i.persons?.full_name || '—'}</td>
                  <td className="p-3">{i.violation_name || '—'}</td>
                  <td className="p-3">{i.severity}</td>
                  <td className="p-3">{Number(i.marks_deducted) || 0}</td>
                  <td className="p-3">
                    {canWrite ? (
                      <Select className="h-8 w-40 text-xs" value={i.status} onChange={e => changeStatus(i, e)}
                        aria-label={`Status for incident of ${i.persons?.full_name || 'person'}`}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </Select>
                    ) : <Badge variant="outline">{i.status}</Badge>}
                  </td>
                  {canWrite && <td className="p-3">{isAdmin && <button className="text-sm text-destructive hover:underline" onClick={() => remove(i)}>Delete</button>}</td>}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-muted-foreground">No incidents recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
