import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { createInstitution } from '../lib/api.js';
import { Link } from 'react-router-dom';
import { useOrg } from '../hooks/useOrg.jsx';
import { TRACK_LABELS } from '../lib/discipline.js';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Select } from '../components/ui/select.jsx';
import SdmsLogo from '../components/SdmsLogo.jsx';

export default function Setup() {
  const { orgs, orgsLoaded, refresh, setActiveOrg } = useOrg();
  const hasOrgs = orgsLoaded && orgs.length > 0;
  const [name, setName] = useState('');
  const [track, setTrack] = useState('HIGH_SCHOOL');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Reached by the automatic 'no organization yet' redirect, but the account does have organizations
  // (this can happen for a moment right after signing in): go to the dashboard instead of staying here.
  if (hasOrgs && location.state?.auto) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your organization name.'); return; }
    setBusy(true);
    try {
      const created = await createInstitution({ name: name.trim(), track, timezone: 'Africa/Kigali' });
      // Land directly on the newly created team.
      await refresh();
      if (created?.data?.id) setActiveOrg(created.data.id);
      navigate('/dashboard', { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <SdmsLogo />
        <div>
          <h2 className="text-xl font-semibold">{hasOrgs ? 'Add another organization' : 'Set up your institution'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{hasOrgs ? 'Use the same account for another track or group. Each one has its own people, cases and settings.' : 'Create an institution to start tracking discipline. Default incident categories for your track are added automatically.'}</p>
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
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating…' : (hasOrgs ? 'Add organization' : 'Create institution')}</Button>
          {hasOrgs && <Link to="/dashboard" className="block text-center text-sm text-muted-foreground hover:text-foreground">Cancel</Link>}
        </form>
      </div>
    </div>
  );
}
