import { useEffect, useState } from 'react';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import { listViolations, createViolation, updateViolation, deleteViolation } from '../lib/api.js';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Select } from '../components/ui/select.jsx';
import { Label } from '../components/ui/label.jsx';
import { Badge } from '../components/ui/badge.jsx';

const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'N/A'];

export default function Violations() {
  const { orgId } = useOrg();
  const { isAdmin } = useRole();
  const [rows, setRows] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', severity: 'Minor', default_marks_deducted: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const reload = async () => setRows((await listViolations(orgId)).data);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    reload().catch(e => setError(e.message));
    return () => { cancelled = true; };
  }, [orgId]);

  const addViolation = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { organization_id: orgId, name: form.name, severity: form.severity };
      if (form.description) payload.description = form.description;
      if (form.default_marks_deducted !== '') payload.default_marks_deducted = Number(form.default_marks_deducted);
      await createViolation(payload);
      setAdding(false); setNotice('Violation added.');
      setForm({ name: '', description: '', severity: 'Minor', default_marks_deducted: '' });
      await reload();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const toggleActive = async (v) => {
    setError(''); setNotice('');
    try { await updateViolation(v.id, { active: !v.active }, orgId); setNotice(`${v.name} is now ${!v.active ? 'active' : 'inactive'}.`); await reload(); }
    catch (err) { setError(err.message); }
  };

  const remove = async (v) => {
    if (!window.confirm(`Delete violation "${v.name}"?`)) return;
    setError(''); setNotice('');
    try { await deleteViolation(v.id, orgId); setNotice('Violation deleted.'); await reload(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Violations catalog</h1>
        {isAdmin && <Button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add violation'}</Button>}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}

      {adding && (
        <form onSubmit={addViolation} className="grid gap-4 rounded-lg border bg-card p-6 shadow-sm md:grid-cols-2">
          <div className="space-y-1.5"><Label>Name</Label>
            <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Late arrival" /></div>
          <div className="space-y-1.5"><Label>Severity</Label>
            <Select value={form.severity} onChange={e => set('severity', e.target.value)}>
              {SEVERITIES.map(s => <option key={s}>{s}</option>)}
            </Select></div>
          <div className="space-y-1.5"><Label>Default marks deducted</Label>
            <Input type="number" min="0" step="0.5" value={form.default_marks_deducted} onChange={e => set('default_marks_deducted', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div className="flex justify-end md:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save violation'}</Button></div>
        </form>
      )}

      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Severity</th><th className="p-3 font-medium">Default marks</th>
              <th className="p-3 font-medium">Status</th>{isAdmin && <th className="p-3 font-medium"></th>}
            </tr></thead>
            <tbody>
              {rows.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{v.name}</td>
                  <td className="p-3">{v.category || '—'}</td>
                  <td className="p-3">{v.severity}</td>
                  <td className="p-3">{Number(v.default_marks_deducted) || 0}</td>
                  <td className="p-3"><Badge variant={v.active ? 'default' : 'secondary'}>{v.active ? 'Active' : 'Inactive'}</Badge></td>
                  {isAdmin && (
                    <td className="p-3 space-x-3">
                      <button className="text-sm text-primary hover:underline" onClick={() => toggleActive(v)}>{v.active ? 'Deactivate' : 'Activate'}</button>
                      <button className="text-sm text-destructive hover:underline" onClick={() => remove(v)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-muted-foreground">No violations defined yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
