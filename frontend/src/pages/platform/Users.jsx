import { useEffect, useState } from 'react';
import { platformGet } from '../../lib/api.js';

export default function Users() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    platformGet('users').then(({ data }) => setUsers(data)).catch(e => setError(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {!users ? <p className="text-muted-foreground">Loading…</p> : users.length === 0 ? <p className="text-muted-foreground">No users registered yet.</p> : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Joined</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{u.full_name || u.id}</td>
                  <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
