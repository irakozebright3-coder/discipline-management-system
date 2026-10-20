import React, { useEffect, useState } from 'react';
import { listPersons, createPerson, updatePerson, deletePerson } from '../lib/api.js';

const STATUSES = ['Active', 'Suspended', 'Inactive', 'Under Review'];
const EMPTY = { full_name: '', person_id: '', gender: '', status: 'Active', guardian_contact: '', academic_year: '' };

export default function Persons({ orgId, canWrite, isAdmin }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  function load() {
    return listPersons(orgId)
      .then(({ data }) => setRows(data))
      .catch(err => setError(err.message));
  }
  useEffect(() => { setRows(null); setError(''); load(); }, [orgId]);

  async function addPerson(e) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        organization_id: orgId, track: 'HIGH_SCHOOL',
        full_name: form.full_name, person_id: form.person_id
      };
      for (const k of ['gender', 'guardian_contact', 'academic_year']) if (form[k]) payload[k] = form[k];
      if (STATUSES.includes(form.status)) payload.status = form.status;
      await createPerson(payload);
      setForm(EMPTY); setAdding(false); setNotice('Person added.');
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function changeStatus(id, status) {
    setError(''); setNotice('');
    try {
      await updatePerson(id, { status }, orgId);
      setNotice('Status updated.');
      await load();
    } catch (err) { setError(err.message); }
  }

  async function remove(id, name) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setError(''); setNotice('');
    try {
      await deletePerson(id, orgId);
      setNotice('Person deleted.');
      await load();
    } catch (err) { setError(err.message); }
  }

  if (!rows) return <p className="muted">Loading…</p>;
  const filtered = rows.filter(r => (r.full_name + ' ' + r.person_id).toLowerCase().includes(search.toLowerCase()));

  return (
    <section>
      <div className="row-between">
        <h2 className="page-title">People</h2>
        {canWrite && <button className="sdms-liquid" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add person'}</button>}
      </div>
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {adding && (
        <form className="sdms-card form-card" onSubmit={addPerson}>
          <input className="sdms-input" placeholder="Full name" required value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })} />
          <input className="sdms-input" placeholder="Person ID (e.g. student number)" required value={form.person_id}
            onChange={e => setForm({ ...form, person_id: e.target.value })} />
          <select className="sdms-input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
            <option value="">Gender (optional)</option>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
          <input className="sdms-input" placeholder="Guardian contact (optional)" value={form.guardian_contact}
            onChange={e => setForm({ ...form, guardian_contact: e.target.value })} />
          <input className="sdms-input" placeholder="Academic year (optional)" value={form.academic_year}
            onChange={e => setForm({ ...form, academic_year: e.target.value })} />
          <select className="sdms-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="sdms-liquid" disabled={busy}>{busy ? 'Saving…' : 'Save person'}</button>
        </form>
      )}

      <input className="sdms-input search" placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.length === 0 ? (
        <p className="muted">No people found. {canWrite ? 'Add one to get started.' : ''}</p>
      ) : (
        <table className="table">
          <thead><tr><th>Name</th><th>Person ID</th><th>Status</th><th>Guardian</th><th>Academic year</th>{canWrite && <th></th>}</tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>{p.full_name}</td>
                <td>{p.person_id}</td>
                <td>
                  {canWrite
                    ? <select className="sdms-input status-select" value={p.status} onChange={e => changeStatus(p.id, e.target.value)}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    : <span className="pill">{p.status}</span>}
                </td>
                <td>{p.guardian_contact || '—'}</td>
                <td>{p.academic_year || '—'}</td>
                {canWrite && <td>{isAdmin && <button className="link danger" onClick={() => remove(p.id, p.full_name)}>Delete</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
