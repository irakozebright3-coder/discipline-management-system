import React, { useEffect, useState } from 'react';
import { listPersons, listIncidents } from '../lib/api.js';

export default function Overview({ orgId, org, role, onNavigate }) {
  const [persons, setPersons] = useState(null);
  const [incidents, setIncidents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPersons(null); setIncidents(null); setError('');
    Promise.all([listPersons(orgId), listIncidents(orgId)])
      .then(([p, i]) => { setPersons(p.data); setIncidents(i.data); })
      .catch(err => setError(err.message));
  }, [orgId]);

  if (error) return <p className="error">{error}</p>;
  if (!persons || !incidents) return <p className="muted">Loading…</p>;

  const open = incidents.filter(i => !['Resolved', 'Closed'].includes(i.status)).length;
  const serious = incidents.filter(i => i.severity === 'Serious').length;

  return (
    <section>
      <h2 className="page-title">{org ? org.name : 'Overview'} <span className="muted role-chip">role: {role}</span></h2>
      <div className="stat-grid">
        <div className="sdms-card stat"><span className="stat-num">{persons.length}</span><span className="muted">People</span></div>
        <div className="sdms-card stat"><span className="stat-num">{incidents.length}</span><span className="muted">Recorded incidents</span></div>
        <div className="sdms-card stat"><span className="stat-num">{open}</span><span className="muted">Open incidents</span></div>
        <div className="sdms-card stat"><span className="stat-num">{serious}</span><span className="muted">Serious incidents</span></div>
      </div>
      <h3>Recent incidents</h3>
      {incidents.length === 0 ? (
        <p className="muted">No incidents recorded yet. Record one from the Incidents tab.</p>
      ) : (
        <table className="table">
          <thead><tr><th>Date</th><th>Person</th><th>Violation</th><th>Severity</th><th>Status</th></tr></thead>
          <tbody>
            {incidents.slice(0, 8).map(i => (
              <tr key={i.id}>
                <td>{i.incident_date}</td>
                <td>{i.persons?.full_name || '—'}</td>
                <td>{i.violation_name || '—'}</td>
                <td>{i.severity}</td>
                <td><span className={'pill st-' + i.status.toLowerCase().replace(/\s/g, '-')}>{i.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="link" onClick={() => onNavigate('incidents')}>Go to incidents →</button>
    </section>
  );
}
