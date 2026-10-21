import { useState } from 'react';
import { setupOrganization } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import LiquidButton from '../components/LiquidButton.jsx';

export default function SetupView({ onCreated }) {
  const [name, setName] = useState('');
  const [track, setTrack] = useState('HIGH_SCHOOL');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your organization name.'); return; }
    setBusy(true);
    try {
      await setupOrganization(name.trim(), track);
      onCreated();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <section className="center">
      <div className="card setup-card">
        <h2>Set up your organization</h2>
        <p className="muted">You are not in any organization yet. Create one to start tracking discipline —
        default violations for your track are added automatically.</p>
        <form onSubmit={create} className="setup-form">
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="Organization name (e.g. Karenge Adventist Secondary School)" required />
          <select className="input" value={track} onChange={e => setTrack(e.target.value)} aria-label="Discipline track">
            {Object.entries(TRACK_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {error && <p className="error" role="alert">{error}</p>}
          <LiquidButton type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create organization'}</LiquidButton>
        </form>
      </div>
    </section>
  );
}
