import React, { useEffect, useState } from 'react';
import { listIncidents, createIncident, updateIncident, deleteIncident, listPersons, listViolations } from '../lib/api.js';

const STATUSES = ['Reported', 'Under Review', 'Confirmed', 'Resolved', 'Appealed', 'Closed'];
const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'N/A'];

export default function Incidents({ orgId, canWrite, isAdmin }) {
  const [rows, setRows] = useState(null);
  const [persons, setPersons] = useState([]);
  const [violations, setViolations] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ person_id: '', violation_id: '', incident_date: '', severity: 'Minor', description: '', location: '', reason: '' });

  function load() {
    return Promise.all([listIncidents(orgId), listPersons(orgId), listViolations(orgId)])
      .then(([i, p, v]) => { setRows(i.data); setPersons(p.data); setViolations(v.data); })
      .catch(err => setError(err.message));
  }
  useEffect(() => { setRows(null); setError(''); load(); }, [orgId]);

  async function addIncident(e) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        organization_id: orgId, track: 'HIGH_SCHOOL',
        person_id: form.person_id, incident_date: form.incident_date, severity: form.severity
      };
      if (form.violation_id) payload.violation_id = form.violation_id;
      for (const k of ['description', 'location', 'reason']) if (form[k]) payload[k] = form[k];
      await createIncident(payload);
      setAdding(false); setNotice('Incident recorded.');
      setForm({ person_id: '', violation_id: '', incident_date: '', severity: 'Minor', description: '', location: '', reason: '' });
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function changeStatus(id, status) {
    setError(''); setNotice('');
    try {
      await updateIncident(id, { status }, orgId);
      setNotice('Status updated.');
      await load();
    } catch (err) { setError(err.message); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this incident record? This cannot be undone.')) return;
    setError(''); setNotice('');
    try {
      await deleteIncident(id, orgId);
      setNotice('Incident deleted.');
      await load();
    } catch (err) { setError(err.message); }
  }

  if (!rows) return <p className="muted">Loading…</p>;

  return (
    <section>
      <div className="row-between">
        <h2 className="page-title">Incidents</h2>
        {canWrite && <button className="sdms-liquid" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Record incident'}</button>}
      </div>
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {adding && (
        <form className="sdms-card form-card" onSubmit={addIncident}>
          <select className="sdms-input" required value={form.person_id} onChange={e => setForm({ ...form, person_id: e.target.value })}>
            <option value="">Select person…</option>
            {persons.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.person_id})</option>)}
          </select>
          <select className="sdms-input" value={form.violation_id} onChange={e => setForm({ ...form, violation_id: e.target.value })}>
            <option value="">Violation type (optional)…</option>
            {violations.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <input className="sdms-input" type="date" required value={form.incident_date}
            onChange={e => setForm({ ...form, incident_date: e.target.value })} />
          <select className="sdms-input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
            {SEVERITIES.map(s => <option key={s}>{s}</option>)}
          </select>
          <input className="sdms-input" placeholder="Location (optional)" value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })} />
          <input className="sdms-input" placeholder="Reason (optional)" value={form.reason}
            onChange={e => setForm({ ...form, reason: e.target.value })} />
          <textarea className="sdms-input" placeholder="Description of what happened…" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
          <button className="sdms-liquid" disabled={busy}>{busy ? 'Saving…' : 'Save incident'}</button>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="muted">No incidents recorded yet.{canWrite ? ' Record one to get started.' : ''}</p>
      ) : (
        <table className="table">
          <thead><tr><th>Date</th><th>Person</th><th>Violation</th><th>Severity</th><th>Marks</th><th>Status</th>{canWrite && <th></th>}</tr></thead>
          <tbody>
            {rows.map(i => (
              <tr key={i.id}>
                <td>{i.incident_date}</td>
                <td>{i.persons?.full_name || '—'}</td>
                <td>{i.violation_name || i.description?.slice(0, 40) || '—'}</td>
                <td>{i.severity}</td>
                <td>{Number(i.marks_deducted) || 0}</td>
                <td>
                  {canWrite
                    ? <select className="sdms-input status-select" value={i.status} onChange={e => changeStatus(i.id, e.target.value)}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    : <span className={'pill st-' + i.status.toLowerCase().replace(/\s/g, '-')}>{i.status}</span>}
                </td>
                {canWrite && <td>{isAdmin && <button className="link danger" onClick={() => remove(i.id)}>Delete</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
