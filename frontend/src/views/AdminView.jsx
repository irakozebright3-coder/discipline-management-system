import { useEffect, useState } from 'react';
import { listPersons, listIncidents, listViolations } from '../lib/api.js';
import SlidingTitle from '../components/SlidingTitle.jsx';
import TiltCard from '../components/TiltCard.jsx';

export default function AdminView({ orgId, org, role }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setStats(null); setError('');
    (async () => {
      try {
        const [p, i, v] = await Promise.all([listPersons(orgId), listIncidents(orgId), listViolations(orgId)]);
        if (cancelled) return;
        setStats({ people: p.data.length, incidents: i.data.length, violations: v.data.length });
      } catch (err) { if (!cancelled) setError(err.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  return (
    <section className="view">
      <SlidingTitle words={['Admin', 'control', 'center']} className="page-title" />
      {error ? (
        <p className="error" role="alert">{error}</p>
      ) : !stats ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="admin-grid">
          <TiltCard className="card admin-card">
            <h3>Organization</h3>
            <dl className="kv">
              <dt>Name</dt><dd>{org?.name}</dd>
              <dt>Type</dt><dd>{org?.type}</dd>
              <dt>Track</dt><dd>{org?.track}</dd>
              <dt>Your role</dt><dd><span className="pill">{role}</span></dd>
            </dl>
          </TiltCard>

          <TiltCard className="card admin-card">
            <h3>Records</h3>
            <dl className="kv">
              <dt>People</dt><dd>{stats.people}</dd>
              <dt>Incidents</dt><dd>{stats.incidents}</dd>
              <dt>Violation types</dt><dd>{stats.violations}</dd>
            </dl>
          </TiltCard>

          <TiltCard className="card admin-card">
            <h3>Admin capabilities</h3>
            <ul className="hero-points">
              <li>Manage the violations catalog (Violations tab)</li>
              <li>Delete people and incident records</li>
              <li>Update incident status workflow</li>
            </ul>
          </TiltCard>

          <TiltCard className="card admin-card">
            <h3>Security posture</h3>
            <ul className="hero-points">
              <li>All writes require teacher, staff or admin role</li>
              <li>Deletes and catalog edits are admin-only</li>
              <li>Every change is written to the audit log</li>
            </ul>
          </TiltCard>
        </div>
      )}
    </section>
  );
}
