import React, { useEffect, useState } from 'react';
import { listViolations, createViolation, updateViolation, deleteViolation } from '../lib/api.js';

const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'N/A'];
const EMPTY = { name: '', description: '', severity: 'Minor', default_marks_deducted: '' };

export default function Violations({ orgId, canWrite }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  function load() {
    return listViolations(orgId).then(({ data }) => setRows(data)).catch(err => setError(err.message));
  }
  useEffect(() => { setRows(null); setError(''); load(); }, [orgId]);

  async function addViolation(e) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { organization_id: orgId, name: form.name, severity: form.severity };
      if (form.description) payload.description = form.description;
      if (form.default_marks_deducted !== '') payload.default_marks_deducted = Number(form.default_marks_deducted);
      await createViolation(payload);
      setForm(EMPTY); setAdding(false); setNotice('Violation added.');
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function toggleActive(v) {
    setError(''); setNotice('');
    try {
      await updateViolation(v.id, { active: !v.active }, orgId);
      setNotice(`${v.name} is now ${!v.active ? 'active' : 'inactive'}.`);
      await load();
    } catch (err) { setError(err.message); }
  }

  async function remove(v) {
    if (!window.confirm(`Delete violation "${v.name}"?`)) return;
    setError(''); setNotice('');
    try {
      await deleteViolation(v.id, orgId);
      setNotice('Violation deleted.');
      await load();
    } catch (err) { setError(err.message); }
  }

  if (!rows) return <p className="muted">Loading…</p>;

  return (
    <section>
      <div className="row-between">
        <h2 className="page-title">Violations catalog</h2>
        {canWrite && <button className="sdms-liquid" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add violation'}</button>}
      </div>
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {adding && (
        <form className="sdms-card form-card" onSubmit={addViolation}>
          <input className="sdms-input" placeholder="Violation name (e.g. Late arrival)" required value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <select className="sdms-input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
            {SEVERITIES.map(s => <option key={s}>{s}</option>)}
          </select>
          <input className="sdms-input" type="number" min="0" step="0.5" placeholder="Default marks deducted (optional)"
            value={form.default_marks_deducted} onChange={e => setForm({ ...form, default_marks_deducted: e.target.value })} />
          <input className="sdms-input" placeholder="Description (optional)" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
          <button className="sdms-liquid" disabled={busy}>{busy ? 'Saving…' : 'Save violation'}</button>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="muted">No violations defined yet.{canWrite ? ' Add the violations your organization tracks.' : ''}</p>
      ) : (
        <table className="table">
          <thead><tr><th>Name</th><th>Severity</th><th>Default marks</th><th>Status</th>{canWrite && <th></th>}</tr></thead>
          <tbody>
            {rows.map(v => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td>{v.severity}</td>
                <td>{Number(v.default_marks_deducted) || 0}</td>
                <td><span className={'pill ' + (v.active ? 'st-active' : 'st-inactive')}>{v.active ? 'Active' : 'Inactive'}</span></td>
                {canWrite && (
                  <td>
                    <button className="link" onClick={() => toggleActive(v)}>{v.active ? 'Deactivate' : 'Activate'}</button>
                    <button className="link danger" onClick={() => remove(v)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
