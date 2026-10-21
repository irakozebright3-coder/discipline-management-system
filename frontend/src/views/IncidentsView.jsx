import { useEffect, useState } from 'react';
import { listIncidents, createIncident, updateIncident, deleteIncident, listPersons, listViolations } from '../lib/api.js';
import LiquidButton from '../components/LiquidButton.jsx';

const STATUSES = ['Reported', 'Under Review', 'Confirmed', 'Resolved', 'Appealed', 'Closed'];
const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'N/A'];
const EMPTY = () => ({ person_id: '', violation_id: '', incident_date: '', severity: 'Minor', description: '', location: '', reason: '' });

export default function IncidentsView({ orgId, canWrite, isAdmin }) {
  const [rows, setRows] = useState(null);
  const [persons, setPersons] = useState([]);
  const [violations, setViolations] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setRows(null); setError(''); setNotice('');
    (async () => {
      try {
        const [i, p, v] = await Promise.all([listIncidents(orgId), listPersons(orgId), listViolations(orgId)]);
        if (cancelled) return;
        setRows(i.data); setPersons(p.data); setViolations(v.data);
      } catch (err) { if (!cancelled) setError(err.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const filtered = filterStatus ? (rows || []).filter(i => i.status === filterStatus) : (rows || []);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  async function addIncident(e) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { organization_id: orgId, track: 'HIGH_SCHOOL', person_id: form.person_id, incident_date: form.incident_date, severity: form.severity };
      if (form.violation_id) payload.violation_id = form.violation_id;
      for (const k of ['description', 'location', 'reason']) if (form[k]) payload[k] = form[k];
      await createIncident(payload);
      setForm(EMPTY()); setAdding(false); setNotice('Incident recorded.');
      const { data } = await listIncidents(orgId);
      setRows(data);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function changeStatus(i, ev) {
    setError(''); setNotice('');
    try {
      await updateIncident(i.id, { status: ev.target.value }, orgId);
      setNotice('Status updated.');
      const { data } = await listIncidents(orgId);
      setRows(data);
    } catch (err) { setError(err.message); }
  }

  async function remove(i) {
    if (!window.confirm('Delete this incident record? This cannot be undone.')) return;
    setError(''); setNotice('');
    try {
      await deleteIncident(i.id, orgId);
      setNotice('Incident deleted.');
      const { data } = await listIncidents(orgId);
      setRows(data);
    } catch (err) { setError(err.message); }
  }

  return (
    <section className="view">
      <div className="row-between">
        <h2 className="page-title">Incidents</h2>
        {canWrite && <LiquidButton onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Record incident'}</LiquidButton>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {adding && (
        <form className="card form-card" onSubmit={addIncident}>
          <select className="input" value={form.person_id} onChange={e => set('person_id', e.target.value)} required>
            <option value="">Select person…</option>
            {persons.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.person_id})</option>)}
          </select>
          <select className="input" value={form.violation_id} onChange={e => set('violation_id', e.target.value)}>
            <option value="">Violation type (optional)…</option>
            {violations.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <input className="input" type="date" value={form.incident_date} onChange={e => set('incident_date', e.target.value)} required />
          <select className="input" value={form.severity} onChange={e => set('severity', e.target.value)}>
            {SEVERITIES.map(s => <option key={s}>{s}</option>)}
          </select>
          <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Location (optional)" />
          <input className="input" value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Reason (optional)" />
          <textarea className="input wide" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description of what happened…"></textarea>
          <div className="form-actions"><LiquidButton type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save incident'}</LiquidButton></div>
        </form>
      )}

      {rows ? (
        <>
          <div className="table-tools">
            <select className="input filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {filtered.length === 0 ? (
            <p className="muted">No incidents recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Date</th><th>Person</th><th>Violation</th><th>Severity</th><th>Marks</th><th>Status</th>{canWrite && <th></th>}</tr></thead>
                <tbody>
                  {filtered.map(i => (
                    <tr key={i.id}>
                      <td>{i.incident_date}</td>
                      <td>{i.persons?.full_name || '—'}</td>
                      <td>{i.violation_name || '—'}</td>
                      <td>{i.severity}</td>
                      <td>{Number(i.marks_deducted) || 0}</td>
                      <td>
                        {canWrite ? (
                          <select className="input status-select" value={i.status} onChange={e => changeStatus(i, e)}
                            aria-label={`Status for incident of ${i.persons?.full_name || 'person'}`}>
                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`pill st-${i.status.toLowerCase().replace(/\s/g, '-')}`}>{i.status}</span>
                        )}
                      </td>
                      {canWrite && <td>{isAdmin && <button className="link danger" onClick={() => remove(i)}>Delete</button>}</td>}
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
