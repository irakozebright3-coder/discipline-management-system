import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, GitBranch, UserCheck, BarChart3, GraduationCap, School, Briefcase, HeartHandshake, Users } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import { getCommunityStats, getCreatorProfile } from '../lib/api.js';
import CreatorBadge from '../components/CreatorBadge.jsx';
import MemberGallery from '../components/MemberGallery.jsx';
import { TRACKS, WELCOME_MEMBERS, membersByTrack } from '../lib/memberGallery.js';

const TRACK_ICONS = {
  HIGH_SCHOOL: School, UNIVERSITY: GraduationCap, COMPANY: Briefcase,
  ORGANIZATION: HeartHandshake, COMMUNITY: Users
};

const TRACK_TEXT = {
  HIGH_SCHOOL: 'Track conduct, marks per term and counselling follow-ups against a 40-mark starting score.',
  UNIVERSITY: 'Handle misconduct, academic integrity and appeals for faculties and cohorts without forced marks.',
  COMPANY: 'Record policy and safety violations, assign corrective actions and keep a defensible audit trail.',
  ORGANIZATION: 'Manage conduct cases across branches and offices, with review and appeal stages kept separate.',
  COMMUNITY: 'Document code of conduct cases, follow-ups and outcomes for members and volunteers.'
};

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
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          <UserCheck className="h-3.5 w-3.5 text-primary" /> One platform, five institution tracks
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Welcome to the Discipline <span className="text-primary">Management System</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Track conduct, violations and discipline marks, with a real review and decision workflow, across schools,
          universities, companies, organizations and communities. Meet some of the people it serves.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/register"><Button size="lg">Get started <ArrowRight className="h-4 w-4" /></Button></Link>
          <Link to="/login"><Button size="lg" variant="outline">Sign in</Button></Link>
        </div>
      </div>

      {/* Welcome wall: every member photo on the home page */}
      <section className="mt-16">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Meet the {WELCOME_MEMBERS.length} people on the platform</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Students, staff, professionals and community members — a welcoming look at the people this system is built for.
          </p>
        </div>
        <MemberGallery />
      </section>

      {/* Track cards, each carrying its own members */}
      <section className="mt-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Built for every track</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          Each track has its own rules, and its own people. Open a track to see who is on it.
        </p>
        <div className="mt-8 space-y-6">
          {TRACKS.map(t => {
            const Icon = TRACK_ICONS[t.key];
            const members = membersByTrack(t.key);
            return (
              <Card key={t.key} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                      <div>
                        <h3 className="font-semibold">{t.label}</h3>
                        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{TRACK_TEXT[t.key]}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{members.length} members shown</p>
                      </div>
                    </div>
                    <Link to={`/tracks/${t.path}`}>
                      <Button variant="outline" size="sm">View track <ArrowRight className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                  <MemberGallery members={members} showRoles={false} className="mt-4 grid-cols-4 md:grid-cols-4" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: 'Role-based access', text: 'Institution admins, disciplinary officers, reviewers, staff and auditors each get exactly the permissions they need — enforced on the server, not just hidden in the UI.' },
          { icon: GitBranch, title: 'Real case workflow', text: 'Reported → Under review → Decision → Appeal → Closed, with separation of duties, evidence, corrective actions and follow-ups.' },
          { icon: BarChart3, title: 'Reports and history', text: 'Term and annual score reports, filters by date and category, CSV export, and an audit trail of every recorded action.' }
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
          <div className="text-center"><p className="text-3xl font-bold text-primary">{stats.institutions ?? stats.organizations ?? 0}</p><p className="text-sm text-muted-foreground">Institutions</p></div>
          <div className="text-center"><p className="text-3xl font-bold text-primary">{stats.people ?? 0}</p><p className="text-sm text-muted-foreground">People managed</p></div>
          <div className="text-center"><p className="text-3xl font-bold text-primary">{stats.incidents ?? 0}</p><p className="text-sm text-muted-foreground">Cases recorded</p></div>
          <div className="text-center"><p className="text-3xl font-bold text-primary">{stats.visitors ?? 0}</p><p className="text-sm text-muted-foreground">Visits</p></div>
        </div>
      )}
    </div>
  );
}
