import { useEffect, useState } from 'react';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../lib/api.js';
import SearchBar from '../components/SearchBar.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Select } from '../components/ui/select.jsx';
import { Label } from '../components/ui/label.jsx';
import { Badge } from '../components/ui/badge.jsx';

const SEVERITIES = ['minor', 'moderate', 'serious', 'not_applicable'];

export default function Categories() {
  const { orgId } = useOrg();
  const { isAdmin } = useRole();
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', description: '', severity: 'minor', default_deduction: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const reload = async () => setRows((await listCategories(orgId)).data);
  useEffect(() => {
    if (!orgId) return;
    reload().catch(e => setError(e.message));
  }, [orgId]);

  const addCategory = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { institution_id: orgId, name: form.name, severity: form.severity };
      for (const k of ['category', 'description']) if (form[k]) payload[k] = form[k];
      if (form.default_deduction !== '') payload.default_deduction = Number(form.default_deduction);
      await createCategory(payload);
      setAdding(false); setNotice('Category added.');
      setForm({ name: '', category: '', description: '', severity: 'minor', default_deduction: '' });
      await reload();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const toggleActive = async (c) => {
    setError(''); setNotice('');
    try { await updateCategory(c.id, { active: !c.active }, orgId); setNotice(`${c.name} is now ${!c.active ? 'active' : 'inactive'}.`); await reload(); }
    catch (err) { setError(err.message); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    setError(''); setNotice('');
    try { await deleteCategory(c.id, orgId); setNotice('Category deleted.'); await reload(); }
    catch (err) { setError(err.message); }
  };

  const needle = search.trim().toLowerCase();
  const visible = (rows || []).filter(c => !needle ||
    [c.name, c.category, c.severity].filter(Boolean).join(' ').toLowerCase().includes(needle));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incident categories</h1>
        {isAdmin && <Button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add category'}</Button>}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}
      {adding && (
        <form onSubmit={addCategory} className="grid gap-4 rounded-lg border bg-card p-6 shadow-sm md:grid-cols-2">
          <div className="space-y-1.5"><Label>Name</Label>
            <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Late arrival" /></div>
          <div className="space-y-1.5"><Label>Severity</Label>
            <Select value={form.severity} onChange={e => set('severity', e.target.value)}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select></div>
          <div className="space-y-1.5"><Label>Group (optional)</Label>
            <Input value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Attendance" /></div>
          <div className="space-y-1.5"><Label>Default deduction</Label>
            <Input type="number" min="0" step="0.5" value={form.default_deduction} onChange={e => set('default_deduction', e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Description (optional)</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div className="flex justify-end md:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save category'}</Button></div>
        </form>
      )}
      <SearchBar value={search} onChange={setSearch} placeholder="Search categories…" ariaLabel="Search categories" className="max-w-sm" />
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Group</th>
              <th className="p-3 font-medium">Severity</th><th className="p-3 font-medium">Default deduction</th>
              <th className="p-3 font-medium">Status</th>{isAdmin && <th className="p-3 font-medium"></th>}
            </tr></thead>
            <tbody>
              {visible.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.category || '—'}</td>
                  <td className="p-3">{c.severity}</td>
                  <td className="p-3">{Number(c.default_deduction) || 0}</td>
                  <td className="p-3"><Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Active' : 'Inactive'}</Badge></td>
                  {isAdmin && (
                    <td className="p-3 space-x-3">
                      <button className="text-sm text-primary hover:underline" onClick={() => toggleActive(c)}>{c.active ? 'Deactivate' : 'Activate'}</button>
                      <button className="text-sm text-destructive hover:underline" onClick={() => remove(c)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-muted-foreground">No categories found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
