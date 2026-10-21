import { useEffect, useState } from 'react';
import { platformGet, platformPost, platformDelete } from '../../lib/api.js';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export default function Backups() {
  const [rows, setRows] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => setRows((await platformGet('backups')).data);
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await platformPost('backups', { name: name.trim() || `Backup ${new Date().toLocaleString()}`, status: 'Completed', size: 'auto' });
      setName('');
      await load();
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete backup record "${b.name}"?`)) return;
    try { await platformDelete(`backups/${b.id}`); await load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Backups</h1>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <form onSubmit={create} className="flex max-w-md gap-2">
        <Input placeholder="Backup name (optional)" value={name} onChange={e => setName(e.target.value)} />
        <Button type="submit" disabled={busy}>{busy ? 'Working…' : 'Create backup record'}</Button>
      </form>
      {!rows ? <p className="text-muted-foreground">Loading…</p> : rows.length === 0 ? <p className="text-muted-foreground">No backups recorded.</p> : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Created</th><th className="p-3 font-medium"></th>
            </tr></thead>
            <tbody>
              {rows.map(b => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{b.name}</td>
                  <td className="p-3"><Badge variant="outline">{b.status}</Badge></td>
                  <td className="p-3">{new Date(b.created_at).toLocaleString()}</td>
                  <td className="p-3"><button className="text-sm text-destructive hover:underline" onClick={() => remove(b)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
