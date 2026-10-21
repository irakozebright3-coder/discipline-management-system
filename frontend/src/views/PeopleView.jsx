import { useEffect, useState } from 'react';
import { listPersons, createPerson, updatePerson, deletePerson, listStructureNodes } from '../lib/api.js';
import PersonForm from '../components/PersonForm.jsx';
import LiquidButton from '../components/LiquidButton.jsx';

const STATUSES = ['Active', 'Suspended', 'Inactive', 'Under Review'];

export default function PeopleView({ orgId, track, canWrite, isAdmin, onOpenStudent }) {
  const [rows, setRows] = useState(null);
  const [classes, setClasses] = useState([]);
  const [trades, setTrades] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isHS = track === 'HIGH_SCHOOL';

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setRows(null); setError(''); setNotice('');
    (async () => {
      try {
        const [p, s] = await Promise.all([
          listPersons(orgId),
          listStructureNodes(orgId).catch(() => ({ data: [] }))
        ]);
        if (cancelled) return;
        setRows(p.data);
        setClasses((s.data || []).filter(n => n.node_type === 'class'));
        setTrades((s.data || []).filter(n => n.node_type === 'trade'));
      } catch (err) { if (!cancelled) setError(err.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const filtered = (rows || []).filter(r =>
    (!statusFilter || r.status === statusFilter) &&
    (r.full_name + ' ' + r.person_id + ' ' + (r.class_id || '')).toLowerCase().includes(search.toLowerCase()));

  async function addPerson(payload) {
    setError(''); setNotice('');
    try {
      await createPerson({ ...payload, organization_id: orgId, track });
      setAdding(false); setNotice('Person added.');
      const { data } = await listPersons(orgId);
      setRows(data);
    } catch (err) { setError(err.message); }
  }

  async function changeStatus(p, ev) {
    setError(''); setNotice('');
    try {
      await updatePerson(p.id, { status: ev.target.value }, orgId);
      setNotice('Status updated.');
      const { data } = await listPersons(orgId);
      setRows(data);
    } catch (err) { setError(err.message); }
  }

  async function remove(p) {
    if (!window.confirm(`Delete ${p.full_name}? This cannot be undone.`)) return;
    setError(''); setNotice('');
    try {
      await deletePerson(p.id, orgId);
      setNotice('Person deleted.');
      const { data } = await listPersons(orgId);
      setRows(data);
    } catch (err) { setError(err.message); }
  }

  return (
    <section className="view">
      <div className="row-between">
        <h2 className="page-title">{isHS ? 'Students' : 'People'}</h2>
        {canWrite && <LiquidButton onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add person'}</LiquidButton>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {adding && (
        <PersonForm orgId={orgId} track={track} classes={classes} trades={trades}
          onSave={addPerson} onCancel={() => setAdding(false)} />
      )}

      {rows ? (
        <>
          <div className="filter-row">
            <input className="input search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, or class…" aria-label="Search people" />
            <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {filtered.length === 0 ? (
            <p className="muted">No people found.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th><th>Person ID</th>
                    {isHS && <th>Class</th>}
                    {isHS && <th>Annual marks</th>}
                    <th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td><button className="link strong" onClick={() => onOpenStudent(p.id)}>{p.full_name}</button></td>
                      <td>{p.person_id}</td>
                      {isHS && <td>{p.class_id || '—'}</td>}
                      {isHS && <td>{Number(p.term1_marks ?? 40) + Number(p.term2_marks ?? 40) + Number(p.term3_marks ?? 40)} / 120</td>}
                      <td>
                        {canWrite ? (
                          <select className="input status-select" value={p.status} onChange={e => changeStatus(p, e)}
                            aria-label={`Status for ${p.full_name}`}>
                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className="pill">{p.status}</span>
                        )}
                      </td>
                      <td>{isAdmin && <button className="link danger" onClick={() => remove(p)}>Delete</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </section>
  );
}
