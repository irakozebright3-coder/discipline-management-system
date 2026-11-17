import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MinusCircle, FileText } from 'lucide-react';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import { getPortal } from '../lib/api.js';
import SearchBar from '../components/SearchBar.jsx';
import DeductMarksDialog from '../components/DeductMarksDialog.jsx';
import DisciplineGauge, { LevelChip, PercentBar } from '../components/DisciplineGauge.jsx';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';

const SORTS = { name: 'Name (A to Z)', low: 'Lowest discipline first', high: 'Highest discipline first' };

export default function PortalDetail() {
  const { unitId } = useParams();
  const { orgId, organization } = useOrg();
  const { canWrite } = useRole();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [deduct, setDeduct] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!orgId || !unitId) return;
    let cancelled = false;
    setData(null);
    getPortal(unitId, orgId).then(r => { if (!cancelled) setData(r.data); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [orgId, unitId, reloadKey]);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = search.trim().toLowerCase();
    const list = data.students.filter(s => !needle || `${s.full_name} ${s.person_id}`.toLowerCase().includes(needle));
    const pct = (s) => (typeof s.percentage === 'number' ? s.percentage : 101);
    if (sort === 'low') list.sort((a, b) => pct(a) - pct(b));
    else if (sort === 'high') list.sort((a, b) => pct(b) - pct(a));
    return list;
  }, [data, search, sort]);

  const isHS = organization?.track === 'HIGH_SCHOOL';
  const done = (res) => {
    setDeduct(null);
    setNotice(`Marks deducted. ${res.marks.level.label} · ${res.marks.percentage}% overall.`);
    setReloadKey(k => k + 1);
  };

  return (
    <div className="space-y-5">
      <Link to="/portals" className="text-sm text-primary hover:underline">← All classes &amp; trades</Link>
      {!data ? <p className="text-muted-foreground">{error || 'Loading…'}</p> : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{data.unit.name}</h1>
              <p className="text-sm capitalize text-muted-foreground">{data.unit.unit_type} portal · {data.summary.students} {data.summary.students === 1 ? 'student' : 'students'}</p>
            </div>
            <DisciplineGauge percentage={data.summary.average_percentage} level={data.summary.level} label="Room discipline" />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(data.summary.distribution).map(([label, n]) => (
              <Card key={label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold tabular-nums">{n}</p></CardContent></Card>
            ))}
          </div>

          {notice && <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300" role="status">{notice}</p>}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <SearchBar value={search} onChange={setSearch} placeholder="Search name or ID…" ariaLabel="Search students" className="max-w-xs" />
            <label className="sr-only" htmlFor="portal-sort">Sort students</label>
            <select id="portal-sort" value={sort} onChange={e => setSort(e.target.value)} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="p-3 font-medium">Student</th>
                <th className="p-3 font-medium text-center">T1</th><th className="p-3 font-medium text-center">T2</th><th className="p-3 font-medium text-center">T3</th>
                <th className="p-3 font-medium">Discipline</th><th className="p-3 font-medium">Level</th><th className="p-3 font-medium text-right">Actions</th>
              </tr></thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3"><Link to={`/people/${s.id}`} className="font-medium hover:text-primary hover:underline">{s.full_name}</Link><p className="text-xs text-muted-foreground">{s.person_id}</p></td>
                    {s.terms.map(t => <td key={t.term} className="p-3 text-center tabular-nums">{t.remaining}<span className="text-xs text-muted-foreground">/{data.rules.starting_marks}</span></td>)}
                    <td className="p-3"><PercentBar value={s.percentage} level={s.level} /></td>
                    <td className="p-3"><LevelChip level={s.level} />{s.pending > 0 && <span className="ml-2 text-xs text-amber-400">{s.pending} pending</span>}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Link to={`/people/${s.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium hover:bg-muted/50" aria-label={`Open ${s.full_name}'s discipline report`}><FileText size={14} /> Report</Link>
                        {isHS && canWrite && <Button size="sm" variant="destructive" onClick={() => setDeduct(s)} aria-label={`Deduct marks from ${s.full_name}`}><MinusCircle size={14} /> Deduct</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-muted-foreground">{data.students.length === 0 ? 'No students in this room yet. Assign students to it from the People page.' : 'No students match your search.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      {deduct && <DeductMarksDialog orgId={orgId} student={deduct} rules={data.rules} onClose={() => setDeduct(null)} onDone={done} />}
    </div>
  );
}
