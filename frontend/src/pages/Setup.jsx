import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInstitution } from '../lib/api.js';
import { Navigate } from 'react-router-dom';
import { useOrg } from '../hooks/useOrg.jsx';
import { TRACK_LABELS } from '../lib/discipline.js';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Select } from '../components/ui/select.jsx';
import SdmsLogo from '../components/SdmsLogo.jsx';

export default function Setup() {
  const { orgs, orgsLoaded, refresh } = useOrg();
  const [name, setName] = useState('');
  const [track, setTrack] = useState('HIGH_SCHOOL');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // Users who already manage a team go straight to it — never stuck here.
  if (orgsLoaded && orgs.length > 0) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your organization name.'); return; }
    setBusy(true);
    try {
      await createInstitution({ name: name.trim(), track, timezone: 'Africa/Kigali' });
      // Land directly on the newly created team.
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <SdmsLogo />
        <div>
          <h2 className="text-xl font-semibold">Set up your institution</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create an institution to start tracking discipline. Default incident categories for your track are added automatically.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="org-name">Institution name</Label>
            <Input id="org-name" required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Karenge Adventist Secondary School" /></div>
          <div className="space-y-1.5"><Label htmlFor="track">Discipline track</Label>
            <Select id="track" value={track} onChange={e => setTrack(e.target.value)}>
              {Object.entries(TRACK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select></div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating…' : 'Create institution'}</Button>
        </form>
      </div>
    </div>
  );
}
