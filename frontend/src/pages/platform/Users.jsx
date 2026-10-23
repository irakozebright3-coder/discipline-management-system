import { useEffect, useState } from 'react';
import { platformGet } from '../../lib/api.js';
import SearchBar from '../../components/SearchBar.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export default function PlatformUsers() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async (q = '') => {
    try {
      const { data } = await platformGet(`users${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setRows(data);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(''); }, []);
  useEffect(() => { if (rows) load(search); }, [search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">Every registered account on the platform.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search name or email…" ariaLabel="Search users" className="max-w-sm" />
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Institutions</th><th className="p-3 font-medium">Owner</th>
              <th className="p-3 font-medium">Joined</th>
            </tr></thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{u.full_name || '—'}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.memberships}</td>
                  <td className="p-3">{u.is_owner && <Badge>Platform owner</Badge>}</td>
                  <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-muted-foreground">No users match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
