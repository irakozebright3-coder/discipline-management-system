import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import { listPersons, createPerson, updatePerson, deletePerson, listStructureNodes } from '../lib/api.js';
import PersonForm from '../components/PersonForm.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Select } from '../components/ui/select.jsx';
import { Badge } from '../components/ui/badge.jsx';

const STATUSES = ['Active', 'Suspended', 'Inactive', 'Under Review'];

export default function People() {
  const { organization, orgId } = useOrg();
  const { isAdmin, canWrite } = useRole();
  const track = organization?.track || 'HIGH_SCHOOL';
  const isHS = track === 'HIGH_SCHOOL';
  const [rows, setRows] = useState(null);
  const [classes, setClasses] = useState([]);
  const [trades, setTrades] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = async () => setRows((await listPersons(orgId)).data);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, s] = await Promise.all([listPersons(orgId), listStructureNodes(orgId).catch(() => ({ data: [] }))]);
        if (cancelled) return;
        setRows(p.data);
        setClasses((s.data || []).filter(n => n.node_type === 'class'));
        setTrades((s.data || []).filter(n => n.node_type === 'trade'));
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const filtered = (rows || []).filter(r =>
    (!statusFilter || r.status === statusFilter) &&
    (r.full_name + ' ' + r.person_id + ' ' + (r.class_id || '')).toLowerCase().includes(search.toLowerCase()));

  const addPerson = async (payload) => {
    setError(''); setNotice('');
    try {
      await createPerson({ ...payload, organization_id: orgId, track });
      setAdding(false); setNotice('Person added.');
      await reload();
    } catch (e) { setError(e.message); }
  };

  const changeStatus = async (p, ev) => {
    setError(''); setNotice('');
    try { await updatePerson(p.id, { status: ev.target.value }, orgId); setNotice('Status updated.'); await reload(); }
    catch (e) { setError(e.message); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.full_name}? This cannot be undone.`)) return;
    setError(''); setNotice('');
    try { await deletePerson(p.id, orgId); setNotice('Person deleted.'); await reload(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isHS ? 'Students' : 'People'}</h1>
        {canWrite && <Button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add person'}</Button>}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}
      {adding && <PersonForm track={track} classes={classes} trades={trades} onSave={addPerson} onCancel={() => setAdding(false)} />}
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search name, ID, class…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search people" />
        <Select className="max-w-[180px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </Select>
      </div>
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Person ID</th>
              {isHS && <th className="p-3 font-medium">Class</th>}
              {isHS && <th className="p-3 font-medium">Annual marks</th>}
              <th className="p-3 font-medium">Status</th><th className="p-3 font-medium"></th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3"><Link className="font-medium text-primary hover:underline" to={`/people/${p.id}`}>{p.full_name}</Link></td>
                  <td className="p-3">{p.person_id}</td>
                  {isHS && <td className="p-3">{p.class_id || '—'}</td>}
                  {isHS && <td className="p-3">{Number(p.term1_marks ?? 40) + Number(p.term2_marks ?? 40) + Number(p.term3_marks ?? 40)} / 120</td>}
                  <td className="p-3">
                    {canWrite ? (
                      <Select className="h-8 w-36 text-xs" value={p.status} onChange={e => changeStatus(p, e)} aria-label={`Status for ${p.full_name}`}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </Select>
                    ) : <Badge variant="outline">{p.status}</Badge>}
                  </td>
                  <td className="p-3">{isAdmin && <button className="text-sm text-destructive hover:underline" onClick={() => remove(p)}>Delete</button>}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-muted-foreground">No people found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
