import { useEffect, useState } from 'react';
import { listPersons, listIncidents } from '../lib/api.js';
import SlidingTitle from '../components/SlidingTitle.jsx';
import TiltCard from '../components/TiltCard.jsx';

export default function OverviewView({ orgId, org, role, onNavigate }) {
  const [persons, setPersons] = useState(null);
  const [incidents, setIncidents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setPersons(null); setIncidents(null); setError('');
    (async () => {
      try {
        const [p, i] = await Promise.all([listPersons(orgId), listIncidents(orgId)]);
        if (cancelled) return;
        setPersons(p.data); setIncidents(i.data);
      } catch (err) { if (!cancelled) setError(err.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const open = (incidents || []).filter(i => !['Resolved', 'Closed'].includes(i.status)).length;
  const serious = (incidents || []).filter(i => i.severity === 'Serious').length;

  return (
    <section className="view">
      <div className="page-head">
        <div>
          <SlidingTitle words={[org ? org.name : 'Overview']} className="page-title" />
          <p className="muted">Your role: <strong>{role}</strong> · {org?.type}</p>
        </div>
        <TiltCard className="mini-stat">
          <span className="stat-num">{incidents?.length ?? '—'}</span>
          <span className="muted">incidents on record</span>
        </TiltCard>
      </div>

      {error ? (
        <p className="error">{error}</p>
      ) : !persons ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="stat-grid">
            {[
              { n: persons.length, label: 'People' },
              { n: incidents.length, label: 'Recorded incidents' },
              { n: open, label: 'Open incidents' },
              { n: serious, label: 'Serious incidents' }
            ].map(s => (
              <TiltCard key={s.label} className="stat">
                <span className="stat-num">{s.n}</span>
                <span className="muted">{s.label}</span>
              </TiltCard>
            ))}
          </div>

          <h3 className="section-title">Recent incidents</h3>
          {incidents.length === 0 ? (
            <p className="muted">No incidents recorded yet. Record one from the Incidents tab.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Date</th><th>Person</th><th>Violation</th><th>Severity</th><th>Status</th></tr></thead>
                <tbody>
                  {incidents.slice(0, 8).map(i => (
                    <tr key={i.id}>
                      <td>{i.incident_date}</td>
                      <td>{i.persons?.full_name || '—'}</td>
                      <td>{i.violation_name || '—'}</td>
                      <td>{i.severity}</td>
                      <td><span className={`pill st-${i.status.toLowerCase().replace(/\s/g, '-')}`}>{i.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="link" onClick={() => onNavigate && onNavigate('incidents')}>Go to incidents →</button>
        </>
      )}
    </section>
  );
}
