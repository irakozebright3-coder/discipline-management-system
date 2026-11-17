import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { School, Wrench, Users, AlertTriangle } from 'lucide-react';
import { useOrg } from '../hooks/useOrg.jsx';
import { listPortals } from '../lib/api.js';
import SearchBar from '../components/SearchBar.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import { LevelChip, PercentBar } from '../components/DisciplineGauge.jsx';

function PortalCard({ p }) {
  const Icon = p.unit_type === 'trade' ? Wrench : School;
  return (
    <Link to={`/portals/${p.id}`} className="group block focus-visible:outline-none">
      <Card className="h-full transition-colors group-hover:border-primary/60 group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={19} /></span>
              <div>
                <p className="font-semibold leading-tight">{p.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{p.unit_type}</p>
              </div>
            </div>
            <LevelChip level={p.level} />
          </div>
          <PercentBar value={p.average_percentage} level={p.level} />
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Users size={14} /> {p.students} {p.students === 1 ? 'student' : 'students'}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Portals() {
  const { orgId, organization } = useOrg();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    listPortals(orgId).then(r => { if (!cancelled) setData(r.data); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [orgId]);

  if (organization && organization.track !== 'HIGH_SCHOOL') {
    return <div className="space-y-2"><h1 className="text-2xl font-bold">Class portals</h1><p className="text-muted-foreground">Class and trade portals are part of the High School track.</p></div>;
  }

  const needle = search.trim().toLowerCase();
  const match = (p) => !needle || p.name.toLowerCase().includes(needle);
  const classes = (data?.portals || []).filter(p => p.unit_type !== 'trade').filter(match);
  const trades = (data?.portals || []).filter(p => p.unit_type === 'trade').filter(match);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Class &amp; trade portals</h1>
          <p className="text-sm text-muted-foreground">Open a class or trade to see its students, their discipline level, and to deduct marks.</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search classes and trades…" ariaLabel="Search portals" className="max-w-xs" />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {!data && !error && <p className="text-muted-foreground">Loading…</p>}
      {data && (data.portals.length === 0 ? (
        <Card><CardContent className="space-y-2 p-6">
          <p className="font-medium">No classes or trades yet.</p>
          <p className="text-sm text-muted-foreground">Add them under <Link to="/structure" className="text-primary hover:underline">Structure</Link>, then assign students to them from the People page. Each one gets its own portal here.</p>
        </CardContent></Card>
      ) : (
        <>
          {classes.length > 0 && <section className="space-y-3"><h2 className="text-lg font-semibold">Classes</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{classes.map(p => <PortalCard key={p.id} p={p} />)}</div></section>}
          {trades.length > 0 && <section className="space-y-3"><h2 className="text-lg font-semibold">Trades</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{trades.map(p => <PortalCard key={p.id} p={p} />)}</div></section>}
          {data.unassigned.students > 0 && (
            <Link to="/portals/unassigned" className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm hover:border-primary/60">
              <AlertTriangle size={18} className="text-amber-400" />
              <span><b>{data.unassigned.students}</b> student{data.unassigned.students === 1 ? ' is' : 's are'} not in any class or trade yet. Open to assign them.</span>
            </Link>
          )}
        </>
      ))}
    </div>
  );
}
