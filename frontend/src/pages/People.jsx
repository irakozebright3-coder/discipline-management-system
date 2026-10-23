import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import { listPeople, createPerson, updatePerson, deletePerson, listStructureNodes } from '../lib/api.js';
import PersonForm from '../components/PersonForm.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { Button } from '../components/ui/button.jsx';
import { Select } from '../components/ui/select.jsx';
import { Badge } from '../components/ui/badge.jsx';

const STATUSES = ['active', 'suspended', 'inactive', 'under_review', 'graduated', 'archived'];

export default function People() {
  const { organization, orgId } = useOrg();
  const { isAdmin, canWrite } = useRole();
  const track = organization?.track || 'HIGH_SCHOOL';
  const isHS = track === 'HIGH_SCHOOL';
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async (p = page) => {
    try {
      const res = await listPeople(orgId, { search, status: statusFilter || undefined, page: p, limit: 25 });
      setRows(res.data); setTotal(res.total); setPage(p);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await listStructureNodes(orgId).catch(() => ({ data: [] }));
        if (cancelled) return;
        setUnits(s.data || []);
        await load(1);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    load(1);
  }, [search, statusFilter]);

  const unitName = (id) => units.find(u => u.id === id)?.name || '';
  const addPerson = async (payload) => {
    setError(''); setNotice('');
    try {
      await createPerson({ ...payload, institution_id: orgId, person_type: payload.person_type || (isHS ? 'student' : 'member') });
      setAdding(false); setNotice('Person added.');
      await load();
    } catch (e) { setError(e.message); }
  };
  const changeStatus = async (p, ev) => {
    setError(''); setNotice('');
    try { await updatePerson(p.id, { status: ev.target.value }, orgId); setNotice('Status updated.'); await load(); }
    catch (e) { setError(e.message); }
  };
  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.full_name}? This cannot be undone.`)) return;
    setError(''); setNotice('');
    try { await deletePerson(p.id, orgId); setNotice('Person deleted.'); await load(); }
    catch (e) { setError(e.message); }
  };

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isHS ? 'Students' : 'People'}</h1>
        {canWrite && <Button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add person'}</Button>}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}
      {adding && <PersonForm track={track} units={units} onSave={addPerson} onCancel={() => setAdding(false)} />}
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search name or ID…" ariaLabel="Search people" className="max-w-sm" />
        <Select className="max-w-[180px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">{total} {total === 1 ? 'person' : 'people'}</span>
      </div>
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Person ID</th>
              {isHS && <th className="p-3 font-medium">Class</th>}
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Status</th><th className="p-3 font-medium"></th>
            </tr></thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3"><Link className="font-medium text-primary hover:underline" to={`/people/${p.id}`}>{p.full_name}</Link></td>
                  <td className="p-3">{p.person_id}</td>
                  {isHS && <td className="p-3">{unitName(p.class_unit_id) || '—'}</td>}
                  <td className="p-3">{p.person_type}</td>
                  <td className="p-3">
                    {canWrite ? (
                      <Select className="h-8 w-36 text-xs" value={p.status} onChange={e => changeStatus(p, e)} aria-label={`Status for ${p.full_name}`}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    ) : <Badge variant="outline">{p.status}</Badge>}
                  </td>
                  <td className="p-3">{isAdmin && <button className="text-sm text-destructive hover:underline" onClick={() => remove(p)}>Delete</button>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-muted-foreground">No people found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</Button>
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
