import { useEffect, useState } from 'react';
import { listAuditLogs } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';

export default function SettingsView({ orgId, org, role, isAdmin }) {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setLogs(null);
    (async () => {
      try {
        const { data } = await listAuditLogs(orgId);
        if (!cancelled) setLogs(data);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  return (
    <section className="view">
      <h2 className="page-title">Settings</h2>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="card">
        <h3>Organization</h3>
        <p><span className="muted">Name:</span> {org?.name}</p>
        <p><span className="muted">Type:</span> {org?.type} ({TRACK_LABELS[org?.track] || org?.track})</p>
        <p><span className="muted">Your role:</span> {role}</p>
        <p><span className="muted">Status:</span> <span className="pill">{org?.suspended ? 'Suspended' : 'Active'}</span></p>
      </div>

      <div className="card">
        <h3>Audit activity</h3>
        {logs ? (
          logs.length === 0 ? (
            <p className="muted">No activity recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td>{new Date(l.created_at).toLocaleString()}</td>
                      <td><span className="pill">{l.action}</span></td>
                      <td>{l.entity_type}</td>
                      <td className="muted">{JSON.stringify(l.details || {}).slice(0, 80)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="muted">Loading…</p>
        )}
      </div>
    </section>
  );
}
