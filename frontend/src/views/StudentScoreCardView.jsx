import { useEffect, useState } from 'react';
import { getPerson, listIncidents, updatePerson, listStructureNodes } from '../lib/api.js';
import DisciplineCard from '../components/DisciplineCard.jsx';
import PersonForm from '../components/PersonForm.jsx';
import MoveClassDialog from '../components/MoveClassDialog.jsx';
import LiquidButton from '../components/LiquidButton.jsx';

export default function StudentScoreCardView({ orgId, personId, track, canWrite, onBack }) {
  const [person, setPerson] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [trades, setTrades] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!orgId || !personId) return;
    let cancelled = false;
    setPerson(null); setError('');
    (async () => {
      try {
        const [p, i, s] = await Promise.all([
          getPerson(personId, orgId),
          listIncidents(orgId),
          listStructureNodes(orgId).catch(() => ({ data: [] }))
        ]);
        if (cancelled) return;
        setPerson(p.data);
        setIncidents((i.data || []).filter(r => r.person_id === personId));
        setClasses((s.data || []).filter(n => n.node_type === 'class'));
        setTrades((s.data || []).filter(n => n.node_type === 'trade'));
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId, personId, reloadKey]);

  const hasGuardian = !!(person && (person.guardian_name || person.guardian_phone || person.guardian_contact));
  const isHS = track === 'HIGH_SCHOOL';

  async function saveChanges(payload) {
    try {
      const { data } = await updatePerson(personId, payload, orgId);
      setPerson(data); setEditing(false);
    } catch (e) { setError(e.message); }
  }

  return (
    <section className="view">
      <button className="link" onClick={onBack}>← Back to people</button>
      {error && <p className="error" role="alert">{error}</p>}

      {person ? (
        <>
          <div className="row-between">
            <div>
              <h2 className="page-title">{person.full_name}</h2>
              <p className="muted">ID {person.person_id} · <span className="pill">{person.status}</span></p>
            </div>
            {canWrite && (
              <div className="cta-row">
                <LiquidButton onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</LiquidButton>
                {isHS && <LiquidButton onClick={() => setMoving(true)}>Move class</LiquidButton>}
              </div>
            )}
          </div>

          {editing ? (
            <PersonForm orgId={orgId} track={track} person={person} classes={classes} trades={trades}
              onSave={saveChanges} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <div className="card">
                <h3>Profile</h3>
                <p><span className="muted">Gender:</span> {person.gender || '—'}</p>
                <p><span className="muted">Date of birth:</span> {person.date_of_birth || '—'}</p>
                {isHS && <p><span className="muted">Class:</span> {person.class_id || '—'} · <span className="muted">Trade:</span> {person.trade_id || '—'}</p>}
                <p><span className="muted">Joined:</span> {person.date_joined || '—'}</p>
              </div>

              {isHS && <DisciplineCard person={person} />}

              <div className="card">
                <h3>Parent / Guardian</h3>
                {hasGuardian ? (
                  <>
                    <p><span className="muted">Name:</span> {person.guardian_name || '—'}</p>
                    <p><span className="muted">Phone:</span> {person.guardian_phone || '—'}</p>
                    {person.guardian_contact && <p><span className="muted">Other contact:</span> {person.guardian_contact}</p>}
                  </>
                ) : (
                  <p className="muted">Guardian information not added.</p>
                )}
              </div>

              <div className="card">
                <h3>Incident history</h3>
                {incidents.length === 0 ? (
                  <p className="muted">No incidents recorded. A clean record.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>Violation</th><th>Term</th><th>Date</th><th>Marks</th><th>Status</th></tr></thead>
                      <tbody>
                        {incidents.map(r => (
                          <tr key={r.id}>
                            <td>{r.violation_name || r.reason || '—'}</td>
                            <td>{r.term}</td>
                            <td>{r.incident_date}</td>
                            <td>{r.marks_deducted}</td>
                            <td><span className="pill">{r.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <p className="muted">Loading…</p>
      )}

      {moving && person && (
        <MoveClassDialog orgId={orgId} person={person}
          onMoved={() => { setMoving(false); setReloadKey(k => k + 1); }} onCancel={() => setMoving(false)} />
      )}
    </section>
  );
}
