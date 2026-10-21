import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowRight, GraduationCap, School, Briefcase, HeartHandshake, Users, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';
import MemberGallery from '../components/MemberGallery.jsx';
import { TRACKS, trackByPath, membersByTrack } from '../lib/memberGallery.js';

const TRACK_ICONS = {
  HIGH_SCHOOL: School, UNIVERSITY: GraduationCap, COMPANY: Briefcase,
  ORGANIZATION: HeartHandshake, COMMUNITY: Users
};

const CONTENT = {
  HIGH_SCHOOL: {
    headline: 'Discipline management for secondary schools',
    intro: 'Everything a school needs to record incidents fairly, track conduct marks per term and follow up with students and guardians.',
    features: [
      'Incident categories seeded per track, with default marks deduction',
      'Term 1–3 marks against a 40-mark starting score (120 annual), pending vs approved clearly separated',
      'Counselling notes, corrective actions and guardian contact on each case',
      'Reports per class, term and category, with CSV export for meetings'
    ]
  },
  UNIVERSITY: {
    headline: 'Conduct and academic integrity for universities',
    intro: 'Handle misconduct and academic integrity cases across faculties, departments, cohorts and programs — with a defensible review and appeal process.',
    features: [
      'Faculties, departments, programs and cohorts as an organised register',
      'Review and decision stages kept separate, with appeal outcomes recorded',
      'Marks deduction optional per institution — policy driven, never forced',
      'History and audit trail for every case and action'
    ]
  },
  COMPANY: {
    headline: 'Workplace conduct and policy cases for companies',
    intro: 'Record policy, safety and conduct violations, assign corrective actions, and keep a clean trail that stands up to scrutiny.',
    features: [
      'Staff and worker register with departments, branches and positions',
      'Corrective actions and follow-up tasks with owners and due dates',
      'Evidence stored privately with short-lived download links',
      'Reports by severity, category and date range'
    ]
  },
  ORGANIZATION: {
    headline: 'Conduct case management for organizations',
    intro: 'Manage cases across branches and offices with clear roles and a full history, whether you are a nonprofit, association or public body.',
    features: [
      'Branch and office structure with members and volunteers',
      'Role-based access: admins, officers, reviewers, staff, auditors',
      'Appeals process with documented outcomes and reversals',
      'Audit history of every action taken'
    ]
  },
  COMMUNITY: {
    headline: 'Code of conduct for communities',
    intro: 'Document conduct cases for members and volunteers, follow them through to a resolution, and keep the community record transparent.',
    features: [
      'Community member register with coordinator roles',
      'Incident reporting by any authorised member of the community team',
      'Follow-ups so agreements do not get forgotten',
      'Simple public information pages for your community'
    ]
  }
};

export default function TrackPage() {
  const { track } = useParams();
  const meta = trackByPath(track);
  if (!meta) return <Navigate to="/" replace />;
  const Icon = TRACK_ICONS[meta.key];
  const content = CONTENT[meta.key];
  const members = membersByTrack(meta.key);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-7 w-7" /></div>
        </div>
        <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">{content.headline}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{content.intro}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/register"><Button size="lg">Start with this track <ArrowRight className="h-4 w-4" /></Button></Link>
          <Link to="/"><Button size="lg" variant="outline">All tracks</Button></Link>
        </div>
      </div>

      {/* Members on this track, with photos */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">People on the {meta.label} track</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {members.length} of the {WELCOME_MEMBERS.length} people on the welcome page serve on the {meta.label} track.
        </p>
        <MemberGallery members={members} className="mt-6" />
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">What this track gives you</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {content.features.map(f => (
            <Card key={f}>
              <CardContent className="flex items-start gap-3 p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">{f}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">Other tracks</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {TRACKS.filter(t => t.key !== meta.key).map(t => {
            const I = TRACK_ICONS[t.key];
            return (
              <Link key={t.key} to={`/tracks/${t.path}`} className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
                <I className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
