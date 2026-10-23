import { useEffect, useState } from 'react';
import { getContributors } from '../../lib/api.js';
import SearchBar from '../../components/SearchBar.jsx';
import { Badge } from '../../components/ui/badge.jsx';

// The public contributor wall shown on the community page — read-only here.
export default function Contributors() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getContributors().then(({ data }) => setRows(data)).catch(e => setError(e.message));
  }, []);

  const needle = search.trim().toLowerCase();
  const visible = (rows || []).filter(c => !needle ||
    [c.name, c.title, c.role].filter(Boolean).join(' ').toLowerCase().includes(needle));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Contributors</h1>
        <p className="text-sm text-muted-foreground">The contributor wall shown on the public community page.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search contributors…" ariaLabel="Search contributors" className="max-w-sm" />
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Role</th><th className="p-3 font-medium">Joined</th>
            </tr></thead>
            <tbody>
              {visible.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.title || '—'}</td>
                  <td className="p-3"><Badge variant="outline">{c.role || 'contributor'}</Badge></td>
                  <td className="p-3 text-muted-foreground">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-muted-foreground">No contributors match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
