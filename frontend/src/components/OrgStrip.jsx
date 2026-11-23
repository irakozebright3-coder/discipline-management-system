import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, School, GraduationCap, Briefcase, HeartHandshake, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrg } from '../hooks/useOrg.jsx';
import { TRACK_LABELS } from '../lib/discipline.js';
import { cn } from '../lib/utils.js';

const ICONS = { HIGH_SCHOOL: School, UNIVERSITY: GraduationCap, COMPANY: Briefcase, ORGANIZATION: HeartHandshake, COMMUNITY: Users };

// Every organization / group this account belongs to, laid out in ONE row (scrolls sideways if there are many).
export default function OrgStrip() {
  const { orgs, orgId, setActiveOrg } = useOrg();
  const rail = useRef(null);
  if (!orgs.length) return null;
  const nudge = (dir) => rail.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  return (
    <nav aria-label="Your organizations" className="mb-5 flex items-center gap-2">
      {orgs.length > 3 && <button type="button" onClick={() => nudge(-1)} aria-label="Scroll organizations left" className="hidden h-9 w-9 shrink-0 place-items-center rounded-md border bg-card hover:bg-accent sm:grid"><ChevronLeft size={16} /></button>}
      <ul ref={rail} className="flex min-w-0 flex-1 flex-nowrap items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {orgs.map(({ institution: i, role }) => {
          const Icon = ICONS[i.track] || Users; const active = i.id === orgId;
          return (
            <li key={i.id} className="shrink-0">
              <button type="button" onClick={() => setActiveOrg(i.id)} aria-current={active ? 'true' : undefined}
                className={cn('flex h-full min-w-[11rem] max-w-[16rem] items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors',
                  active ? 'border-primary bg-primary/10 shadow-sm' : 'bg-card hover:bg-accent')}>
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><Icon size={16} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{i.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{TRACK_LABELS[i.track] || i.track}{role === 'platform_owner' ? ' · Owner view' : ''}</span>
                </span>
              </button>
            </li>
          );
        })}
        <li className="shrink-0">
          <Link to="/setup" className="flex h-full min-w-[9rem] items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground">
            <Plus size={16} /> Add organization
          </Link>
        </li>
      </ul>
      {orgs.length > 3 && <button type="button" onClick={() => nudge(1)} aria-label="Scroll organizations right" className="hidden h-9 w-9 shrink-0 place-items-center rounded-md border bg-card hover:bg-accent sm:grid"><ChevronRight size={16} /></button>}
    </nav>
  );
}
