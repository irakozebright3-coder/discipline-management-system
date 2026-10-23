import { useState } from 'react';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Select } from './ui/select.jsx';

const PHONE_RE = /^\+?[1-9]\d{6,14}$/;
const STATUSES = ['active', 'suspended', 'inactive', 'under_review'];

export default function PersonForm({ track = 'HIGH_SCHOOL', person = null, units = [], onSave, onCancel }) {
  const isHS = track === 'HIGH_SCHOOL';
  const classes = units.filter(u => u.unit_type === 'class');
  const trades = units.filter(u => u.unit_type === 'trade');
  const departments = units.filter(u => ['department', 'academic_department'].includes(u.unit_type));
  const programs = units.filter(u => u.unit_type === 'program');
  const cohorts = units.filter(u => u.unit_type === 'cohort');
  const [form, setForm] = useState(() => ({
    full_name: person?.full_name || '', person_id: person?.person_id || '',
    gender: person?.gender || 'not_specified', status: person?.status || 'active',
    date_of_birth: person?.date_of_birth || '',
    person_type: person?.person_type || (isHS ? 'student' : 'member'),
    class_unit_id: person?.class_unit_id || '', trade_unit_id: person?.trade_unit_id || '',
    department_unit_id: person?.department_unit_id || '', program_unit_id: person?.program_unit_id || '',
    cohort_unit_id: person?.cohort_unit_id || '',
    guardian_name: person?.guardian_name || '', guardian_phone: person?.guardian_phone || '',
    guardian_contact: person?.guardian_contact || ''
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
      person_type: form.person_type, guardian_name: gname, guardian_phone: gphone };
    if (form.gender && form.gender !== 'not_specified') payload.gender = form.gender;
    for (const k of ['date_of_birth', 'class_unit_id', 'trade_unit_id', 'department_unit_id', 'program_unit_id', 'cohort_unit_id', 'guardian_contact'])
      if (form[k]) payload[k] = form[k];
    setBusy(true);
    try { onSave(payload); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" required value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="person_id">Person ID</Label>
          <Input id="person_id" required disabled={!!person} value={form.person_id} onChange={e => set('person_id', e.target.value)} placeholder="e.g. S-001" /></div>
        <div className="space-y-1.5"><Label>Gender</Label>
          <Select value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="not_specified">Not specified</option><option value="male">Male</option><option value="female">Female</option>
          </Select></div>
        <div className="space-y-1.5"><Label>Type</Label>
          <Select value={form.person_type} onChange={e => set('person_type', e.target.value)}>
            {['student', 'staff', 'member', 'worker', 'volunteer'].map(t => <option key={t} value={t}>{t}</option>)}
          </Select></div>
        <div className="space-y-1.5"><Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></div>
        {isHS && <div className="space-y-1.5"><Label>Class</Label>
          <Select value={form.class_unit_id} onChange={e => set('class_unit_id', e.target.value)}>
            <option value="">None</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select></div>}
        {isHS && <div className="space-y-1.5"><Label>Trade</Label>
          <Select value={form.trade_unit_id} onChange={e => set('trade_unit_id', e.target.value)}>
            <option value="">None</option>{trades.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select></div>}
        {departments.length > 0 && <div className="space-y-1.5"><Label>Department</Label>
          <Select value={form.department_unit_id} onChange={e => set('department_unit_id', e.target.value)}>
            <option value="">None</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select></div>}
        {programs.length > 0 && <div className="space-y-1.5"><Label>Program</Label>
          <Select value={form.program_unit_id} onChange={e => set('program_unit_id', e.target.value)}>
            <option value="">None</option>{programs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select></div>}
        {cohorts.length > 0 && <div className="space-y-1.5"><Label>Cohort</Label>
          <Select value={form.cohort_unit_id} onChange={e => set('cohort_unit_id', e.target.value)}>
            <option value="">None</option>{cohorts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select></div>}
      </div>
      {isHS && (
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
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : (person ? 'Save changes' : 'Add person')}</Button>
      </div>
    </form>
  );
}
