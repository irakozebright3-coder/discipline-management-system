import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, FileWarning, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import { getCommunityStats, getCreatorProfile } from '../lib/api.js';
import CreatorBadge from '../components/CreatorBadge.jsx';

const TRACKS = ['High School', 'University', 'Company', 'Organization', 'Community'];

export default function Landing() {
  const [stats, setStats] = useState(null);
  const [creator, setCreator] = useState(null);
  useEffect(() => {
    getCommunityStats().then(({ data }) => setStats(data)).catch(() => {});
    getCreatorProfile().then(({ data }) => setCreator(data)).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        {creator && <div className="mb-6 flex justify-center"><CreatorBadge name={creator.full_name} title={creator.title} /></div>}
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Discipline Management <span className="text-primary">System</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          A complete platform for tracking conduct, violations, and discipline marks — for schools, universities, companies, organizations, and communities.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login"><Button size="lg">Sign in <ArrowRight className="h-4 w-4" /></Button></Link>
          <Link to="/register"><Button size="lg" variant="outline">Create an account</Button></Link>
        </div>
      </div>

      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: 'Role-based access', text: 'Teachers, staff, and admins each get exactly the permissions they need.' },
          { icon: FileWarning, title: 'Incident workflow', text: 'Reported → Under Review → Confirmed → Resolved, with marks deduction on confirmation.' },
          { icon: BarChart3, title: 'Reports & history', text: 'Term summaries, watchlists, CSV export, and a full audit trail of every action.' }
        ].map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardContent className="p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats && (
        <div className="mt-12 grid grid-cols-2 gap-4 rounded-lg border bg-card p-6 md:grid-cols-4">
          <div className="text-center"><p className="text-3xl font-bold text-primary">{stats.organizations}</p><p className="text-sm text-muted-foreground">Organizations</p></div>
          <div className="text-center"><p className="text-3xl font-bold text-primary">{stats.people}</p><p className="text-sm text-muted-foreground">People managed</p></div>
          <div className="text-center"><p className="text-3xl font-bold text-primary">{stats.incidents}</p><p className="text-sm text-muted-foreground">Incidents recorded</p></div>
          <div className="text-center"><p className="text-3xl font-bold text-primary">{stats.visitors}</p><p className="text-sm text-muted-foreground">Visits</p></div>
        </div>
      )}

      <div className="mt-12 flex flex-wrap justify-center gap-2">
        {TRACKS.map(t => <span key={t} className="rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">{t}</span>)}
      </div>
    </div>
  );
}
