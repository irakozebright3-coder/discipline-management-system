import { useEffect, useState } from 'react';
import { listViolations, createViolation, updateViolation, deleteViolation } from '../lib/api.js';
import LiquidButton from '../components/LiquidButton.jsx';

const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'N/A'];
const EMPTY = () => ({ name: '', description: '', severity: 'Minor', default_marks_deducted: '' });

export default function ViolationsView({ orgId, canWrite }) {
  const [rows, setRows] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setRows(null); setError(''); setNotice('');
    (async () => {
      try {
        const { data } = await listViolations(orgId);
        if (!cancelled) setRows(data);
      } catch (err) { if (!cancelled) setError(err.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  async function reload() {
    const { data } = await listViolations(orgId);
    setRows(data);
  }

  async function addViolation(e) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { organization_id: orgId, name: form.name, severity: form.severity };
      if (form.description) payload.description = form.description;
      if (form.default_marks_deducted !== '') payload.default_marks_deducted = Number(form.default_marks_deducted);
      await createViolation(payload);
      setForm(EMPTY()); setAdding(false); setNotice('Violation added.');
      await reload();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function toggleActive(v) {
    setError(''); setNotice('');
    try {
      await updateViolation(v.id, { active: !v.active }, orgId);
      setNotice(`${v.name} is now ${!v.active ? 'active' : 'inactive'}.`);
      await reload();
    } catch (err) { setError(err.message); }
  }

  async function remove(v) {
    if (!window.confirm(`Delete violation "${v.name}"?`)) return;
    setError(''); setNotice('');
    try {
      await deleteViolation(v.id, orgId);
      setNotice('Violation deleted.');
      await reload();
    } catch (err) { setError(err.message); }
  }

  return (
    <section className="view">
      <div className="row-between">
        <h2 className="page-title">Violations catalog</h2>
        {canWrite && <LiquidButton onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add violation'}</LiquidButton>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {adding && (
        <form className="card form-card" onSubmit={addViolation}>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Violation name (e.g. Late arrival)" required />
          <select className="input" value={form.severity} onChange={e => set('severity', e.target.value)}>
            {SEVERITIES.map(s => <option key={s}>{s}</option>)}
          </select>
          <input className="input" type="number" min="0" step="0.5" value={form.default_marks_deducted}
            onChange={e => set('default_marks_deducted', e.target.value)} placeholder="Default marks deducted (optional)" />
          <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description (optional)" />
          <div className="form-actions"><LiquidButton type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save violation'}</LiquidButton></div>
        </form>
      )}

      {rows ? (
        <>
          {rows.length === 0 && <p className="muted">No violations defined yet.{canWrite ? ' Add the violations your organization tracks.' : ''}</p>}
          {rows.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Severity</th><th>Default marks</th><th>Status</th>{canWrite && <th></th>}</tr></thead>
                <tbody>
                  {rows.map(v => (
                    <tr key={v.id}>
                      <td>{v.name}</td>
                      <td>{v.severity}</td>
                      <td>{Number(v.default_marks_deducted) || 0}</td>
                      <td><span className={`pill ${v.active ? 'st-active' : 'st-inactive'}`}>{v.active ? 'Active' : 'Inactive'}</span></td>
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
            </div>
          )}
        </>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </section>
  );
}
