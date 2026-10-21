import { useEffect, useState } from 'react';
import { platformGet, platformPost, platformDelete } from '../../lib/api.js';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';
import { Select } from '../../components/ui/select.jsx';
import { Textarea } from '../../components/ui/textarea.jsx';

const CATEGORIES = ['Getting started', 'Discipline marks', 'Reports', 'Account & security'];

export default function HelpCenterManage() {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ category: CATEGORIES[0], title: '', content: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => setRows((await platformGet('help-articles')).data);
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const publish = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true); setError('');
    try {
      await platformPost('help-articles', form);
      setForm({ category: CATEGORIES[0], title: '', content: '' });
      await load();
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete article "${a.title}"?`)) return;
    try { await platformDelete(`help-articles/${a.id}`); await load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Help center</h1>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <form onSubmit={publish} className="max-w-2xl space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-1.5"><Label>Category</Label>
          <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select></div>
        <div className="space-y-1.5"><Label>Title</Label>
          <Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Content</Label>
          <Textarea rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></div>
        <Button type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish article'}</Button>
      </form>
      {!rows ? <p className="text-muted-foreground">Loading…</p> : rows.length === 0 ? <p className="text-muted-foreground">No articles yet.</p> : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Title</th><th className="p-3 font-medium">Category</th><th className="p-3 font-medium"></th>
            </tr></thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{a.title}</td>
                  <td className="p-3">{a.category}</td>
                  <td className="p-3"><button className="text-sm text-destructive hover:underline" onClick={() => remove(a)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
