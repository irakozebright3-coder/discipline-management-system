import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { getContributors, getCreatorProfile, getCommunityStats } from '../lib/api.js';
import CreatorBadge from '../components/CreatorBadge.jsx';

export default function Community() {
  const [contributors, setContributors] = useState(null);
  const [creator, setCreator] = useState(null);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    getContributors().then(({ data }) => setContributors(data)).catch(() => setContributors([]));
    getCreatorProfile().then(({ data }) => setCreator(data)).catch(() => {});
    getCommunityStats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-bold">Community</h1>
      {creator && <CreatorBadge name={creator.full_name} title={creator.title} />}
      {creator && (
        <Card>
          <CardHeader><CardTitle>{creator.full_name}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{creator.title}</p>
            <p className="mt-2">{creator.biography}</p>
          </CardContent>
        </Card>
      )}
      <h2 className="text-xl font-semibold pt-2">Contributors</h2>
      {contributors === null ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : contributors.length === 0 ? (
        <p className="text-muted-foreground">No contributors listed yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contributors.map(c => (
            <Card key={c.id}>
              <CardHeader><CardTitle className="text-base">{c.name}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.role}</p>
                <p className="mt-1 text-sm">{c.contribution || c.biography}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {stats && (
        <div className="grid grid-cols-3 gap-4 rounded-lg border bg-card p-6 text-center">
          <div><p className="text-2xl font-bold text-primary">{stats.organizations}</p><p className="text-sm text-muted-foreground">Organizations</p></div>
          <div><p className="text-2xl font-bold text-primary">{stats.contributors ?? '—'}</p><p className="text-sm text-muted-foreground">Contributors</p></div>
          <div><p className="text-2xl font-bold text-primary">{stats.visitors}</p><p className="text-sm text-muted-foreground">Visits</p></div>
        </div>
      )}
    </div>
  );
}
