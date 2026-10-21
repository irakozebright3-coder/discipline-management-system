import { useEffect, useState } from 'react';
import { platformGet, platformPost, platformDelete } from '../../lib/api.js';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';

export default function Contributors() {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', contribution: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => setRows((await platformGet('contributors')).data);
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true); setError('');
    try {
      await platformPost('contributors', { ...form, name: form.name.trim() });
      setForm({ name: '', role: '', contribution: '' });
      await load();
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Remove contributor "${c.name}"?`)) return;
    try { await platformDelete(`contributors/${c.id}`); await load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Contributors</h1>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <form onSubmit={add} className="grid max-w-2xl gap-4 rounded-lg border bg-card p-6 md:grid-cols-3">
        <div className="space-y-1.5"><Label>Name</Label>
          <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Role</Label>
          <Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Contribution</Label>
          <Input value={form.contribution} onChange={e => setForm({ ...form, contribution: e.target.value })} /></div>
        <div className="md:col-span-3"><Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add contributor'}</Button></div>
      </form>
      {!rows ? <p className="text-muted-foreground">Loading…</p> : rows.length === 0 ? <p className="text-muted-foreground">No contributors yet.</p> : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Contribution</th><th className="p-3 font-medium"></th>
            </tr></thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.role || '—'}</td>
                  <td className="p-3">{c.contribution || '—'}</td>
                  <td className="p-3"><button className="text-sm text-destructive hover:underline" onClick={() => remove(c)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
