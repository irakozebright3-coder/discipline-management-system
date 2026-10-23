import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, FileWarning, LifeBuoy } from 'lucide-react';
import { platformGet } from '../../lib/api.js';
import SearchBar from '../../components/SearchBar.jsx';
import StatCard from '../../components/StatCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export default function OwnerDashboard() {
  const [dash, setDash] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    platformGet('dashboard').then(({ data }) => setDash(data)).catch(e => setError(e.message));
  }, []);

  const needle = search.trim().toLowerCase();
  const institutions = (dash?.institutions || []).filter(i => !needle ||
    [i.name, i.track, i.type, i.status].filter(Boolean).join(' ').toLowerCase().includes(needle));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform dashboard</h1>
        <p className="text-sm text-muted-foreground">Everything happening across the Discipline Management platform.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {dash && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Institutions" value={dash.counts.institutions} icon={Building2} />
          <StatCard label="Users" value={dash.counts.users} icon={Users} />
          <StatCard label="Cases recorded" value={dash.counts.incidents} icon={FileWarning} />
          <StatCard label="Open support" value={dash.counts.open_support} icon={LifeBuoy} />
        </div>
      )}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent institutions</CardTitle>
          <SearchBar value={search} onChange={setSearch} placeholder="Search institutions…" ariaLabel="Search institutions" />
        </CardHeader>
        <CardContent>
          {!dash ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Name</th><th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Track</th><th className="py-2 pr-4 font-medium">Members</th><th className="py-2 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {institutions.map(i => (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{i.name}</td>
                    <td className="py-2 pr-4">{i.type}</td>
                    <td className="py-2 pr-4">{i.track}</td>
                    <td className="py-2 pr-4">{i.member_count ?? '—'}</td>
                    <td className="py-2"><Badge variant={i.status === 'active' ? 'default' : 'secondary'}>{i.status}</Badge></td>
                  </tr>
                ))}
                {institutions.length === 0 && <tr><td colSpan="5" className="py-4 text-center text-muted-foreground">No institutions match.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
