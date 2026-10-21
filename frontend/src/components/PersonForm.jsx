import { useState } from 'react';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Select } from './ui/select.jsx';
import { Textarea } from './ui/textarea.jsx';

const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

export default function PersonForm({ track = 'HIGH_SCHOOL', person = null, classes = [], trades = [], onSave, onCancel }) {
  const isHS = track === 'HIGH_SCHOOL';
  const [form, setForm] = useState(() => ({
    full_name: person?.full_name || '', person_id: person?.person_id || '',
    gender: person?.gender || '', status: person?.status || 'Active',
    date_of_birth: person?.date_of_birth || '', academic_year: person?.academic_year || '',
    class_id: person?.class_id || '', trade_id: person?.trade_id || '',
    guardian_contact: person?.guardian_contact || '',
    guardian_name: person?.guardian_name || '', guardian_phone: person?.guardian_phone || '',
    term1_marks: person?.term1_marks ?? 40, term2_marks: person?.term2_marks ?? 40, term3_marks: person?.term3_marks ?? 40
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const gname = String(form.guardian_name || '').trim();
    const gphone = String(form.guardian_phone || '').trim();
    if (isHS && gphone && !PHONE_RE.test(gphone)) {
      setError('Guardian phone must be a valid international number (e.g. +2507…).');
      return;
    }
    const payload = { full_name: form.full_name, person_id: form.person_id, status: form.status,
      guardian_name: gname, guardian_phone: gphone };
    if (form.gender) payload.gender = form.gender;
    for (const k of ['date_of_birth', 'academic_year', 'class_id', 'trade_id', 'guardian_contact']) if (form[k]) payload[k] = form[k];
    if (isHS) {
      payload.term1_marks = Number(form.term1_marks);
      payload.term2_marks = Number(form.term2_marks);
      payload.term3_marks = Number(form.term3_marks);
    }
    setBusy(true);
    try { onSave(payload); } finally { setBusy(false); }
  };

  const field = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" required value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="person_id">Person ID</Label>
          <Input id="person_id" required disabled={!!person} value={form.person_id} onChange={e => set('person_id', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Gender</Label>
          <Select value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="">Not specified</option><option>Male</option><option>Female</option><option>Other</option>
          </Select></div>
        <div className="space-y-1.5"><Label>Status</Label>
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            <option>Active</option><option>Suspended</option><option>Inactive</option><option>Under Review</option>
          </Select></div>
        <div className="space-y-1.5"><Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></div>
        {isHS && <div className="space-y-1.5"><Label htmlFor="ay">Academic year</Label>
          <Input id="ay" value={form.academic_year} onChange={e => set('academic_year', e.target.value)} placeholder="e.g. 2026" /></div>}
        {isHS && <div className="space-y-1.5"><Label>Class</Label>
          <Select value={form.class_id} onChange={e => set('class_id', e.target.value)}>
            <option value="">None</option>{classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select></div>}
        {isHS && <div className="space-y-1.5"><Label>Trade</Label>
          <Select value={form.trade_id} onChange={e => set('trade_id', e.target.value)}>
            <option value="">None</option>{trades.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </Select></div>}
      </div>
      {isHS && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(t => (
            <div key={t} className="space-y-1.5">
              <Label>Term {t} marks</Label>
              <Input type="number" min="0" max="40" value={form[`term${t}_marks`]} onChange={e => set(`term${t}_marks`, e.target.value)} />
            </div>
          ))}
        </div>
      )}
      <div>
        <h4 className="mb-2 text-sm font-semibold">Parent / guardian information</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Guardian name</Label>
            <Input value={form.guardian_name} onChange={e => set('guardian_name', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Guardian phone</Label>
            <Input value={form.guardian_phone} onChange={e => set('guardian_phone', e.target.value)} placeholder="+2507…" /></div>
          <div className="space-y-1.5"><Label>Other contact</Label>
            <Input value={form.guardian_contact} onChange={e => set('guardian_contact', e.target.value)} /></div>
        </div>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : (person ? 'Save changes' : 'Add person')}</Button>
      </div>
    </form>
  );
}
