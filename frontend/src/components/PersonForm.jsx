import { useState } from 'react';
import LiquidButton from './LiquidButton.jsx';

const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

export default function PersonForm({ orgId, track = 'HIGH_SCHOOL', person = null, classes = [], trades = [], onSave, onCancel }) {
  const isHS = track === 'HIGH_SCHOOL';
  const [form, setForm] = useState(() => ({
    full_name: person?.full_name || '',
    person_id: person?.person_id || '',
    gender: person?.gender || '',
    status: person?.status || 'Active',
    date_of_birth: person?.date_of_birth || '',
    academic_year: person?.academic_year || '',
    class_id: person?.class_id || '',
    trade_id: person?.trade_id || '',
    guardian_contact: person?.guardian_contact || '',
    guardian_name: person?.guardian_name || '',
    guardian_phone: person?.guardian_phone || '',
    term1_marks: person?.term1_marks ?? 40,
    term2_marks: person?.term2_marks ?? 40,
    term3_marks: person?.term3_marks ?? 40
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    const gname = String(form.guardian_name || '').trim();
    const gphone = String(form.guardian_phone || '').trim();
    if (isHS && gphone && !PHONE_RE.test(gphone)) {
      setError('Guardian phone must be a valid international number (e.g. +2507…).');
      return;
    }
    const payload = { full_name: form.full_name, person_id: form.person_id };
    if (form.gender) payload.gender = form.gender;
    payload.status = form.status;
    for (const k of ['date_of_birth', 'academic_year', 'guardian_contact']) if (form[k]) payload[k] = form[k];
    // Guardian fields are trimmed before saving (spec).
    payload.guardian_name = gname;
    payload.guardian_phone = gphone;
    if (isHS) {
      for (const k of ['class_id', 'trade_id']) if (form[k]) payload[k] = form[k];
      payload.term1_marks = Number(form.term1_marks);
      payload.term2_marks = Number(form.term2_marks);
      payload.term3_marks = Number(form.term3_marks);
    }
    setBusy(true);
    try { onSave(payload); } finally { setBusy(false); }
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Full name" required />
      <input className="input" value={form.person_id} onChange={e => set('person_id', e.target.value)}
        placeholder="Person ID (e.g. student number)" required disabled={!!person} />
      <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
        <option value="">Gender (optional)</option>
        <option>Male</option><option>Female</option><option>Other</option>
      </select>
      <input className="input" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} aria-label="Date of birth" />
      <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
        <option>Active</option><option>Suspended</option><option>Inactive</option><option>Under Review</option>
      </select>

      {isHS ? (
        <>
          <input className="input" value={form.academic_year} onChange={e => set('academic_year', e.target.value)} placeholder="Academic year (e.g. 2026)" />
          <select className="input" value={form.class_id} onChange={e => set('class_id', e.target.value)} aria-label="Class">
            <option value="">Class (optional)</option>
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select className="input" value={form.trade_id} onChange={e => set('trade_id', e.target.value)} aria-label="Trade">
            <option value="">Trade (optional)</option>
            {trades.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <div className="form-grid">
            <label>Term 1 marks
              <input className="input" type="number" min="0" max="40" value={form.term1_marks}
                onChange={e => set('term1_marks', e.target.value)} />
            </label>
            <label>Term 2 marks
              <input className="input" type="number" min="0" max="40" value={form.term2_marks}
                onChange={e => set('term2_marks', e.target.value)} />
            </label>
            <label>Term 3 marks
              <input className="input" type="number" min="0" max="40" value={form.term3_marks}
                onChange={e => set('term3_marks', e.target.value)} />
            </label>
          </div>
          <h4>Parent / Guardian information (optional)</h4>
          <input className="input" value={form.guardian_name} onChange={e => set('guardian_name', e.target.value)} placeholder="Guardian name" />
          <input className="input" value={form.guardian_phone} onChange={e => set('guardian_phone', e.target.value)} placeholder="International phone (e.g. +2507…)" />
          <input className="input" value={form.guardian_contact} onChange={e => set('guardian_contact', e.target.value)} placeholder="Other contact (legacy field, optional)" />
        </>
      ) : (
        <input className="input" value={form.guardian_contact} onChange={e => set('guardian_contact', e.target.value)} placeholder="Emergency contact (optional)" />
      )}

      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-actions">
        <LiquidButton type="submit" disabled={busy}>{busy ? 'Saving…' : (person ? 'Save changes' : 'Add person')}</LiquidButton>
        <button type="button" className="link" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
