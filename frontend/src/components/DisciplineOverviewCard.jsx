import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDisciplineOverview } from '../lib/api.js';
import DisciplineGauge, { LevelChip, PercentBar } from './DisciplineGauge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx';

const GROUP_NOUN = { HIGH_SCHOOL: 'class / trade', UNIVERSITY: 'department / program', COMPANY: 'department', ORGANIZATION: 'department', COMMUNITY: 'group' };
const PEOPLE_NOUN = { HIGH_SCHOOL: 'students', UNIVERSITY: 'students', COMPANY: 'staff', ORGANIZATION: 'members', COMMUNITY: 'members' };

export default function DisciplineOverviewCard({ orgId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setData(null); setError('');
    getDisciplineOverview(orgId).then(r => { if (!cancelled) setData(r.data); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [orgId]);

  if (error) return null;
  const track = data?.track;
  const overall = data?.overall;
  const isHS = track === 'HIGH_SCHOOL';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Discipline level</CardTitle>
        {isHS && <Link to="/portals" className="text-sm text-primary hover:underline">Open class portals →</Link>}
      </CardHeader>
      <CardContent className="space-y-5">
        {!data ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <DisciplineGauge percentage={overall.average_percentage} level={overall.level} label={`Whole ${isHS ? 'school' : 'institution'}`} size={140} />
              <div className="grid min-w-[16rem] flex-1 grid-cols-5 gap-2 text-center">
                {Object.entries(overall.distribution).map(([label, n]) => (
                  <div key={label} className="rounded-lg border p-2"><p className="text-xl font-bold tabular-nums">{n}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
                ))}
              </div>
            </div>
            {overall.average_percentage === null && (
              <p className="text-sm text-muted-foreground">No {PEOPLE_NOUN[track] || 'people'} are registered yet, so there is no level to show. It appears as soon as the first one is added.</p>
            )}
            {data.groups.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">By {GROUP_NOUN[track] || 'group'} <span className="font-normal text-muted-foreground">(lowest first)</span></h3>
                <ul className="divide-y rounded-lg border">
                  {data.groups.slice(0, 8).map(g => (
                    <li key={g.id}>
                      <Link to={isHS ? `/portals/${g.id}` : '/structure'} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/40">
                        <span className="font-medium">{g.name} <span className="text-xs font-normal text-muted-foreground">· {g.students} {PEOPLE_NOUN[track] || 'people'}</span></span>
                        <span className="flex items-center gap-3"><PercentBar value={g.average_percentage} level={g.level} /><LevelChip level={g.level} /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
