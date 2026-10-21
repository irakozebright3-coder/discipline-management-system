import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import { getPerson, listIncidents, updatePerson, listStructureNodes } from '../lib/api.js';
import DisciplineCard from '../components/DisciplineCard.jsx';
import PersonForm from '../components/PersonForm.jsx';
import MoveClassDialog from '../components/MoveClassDialog.jsx';
import { Button } from '../components/ui/button.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';

export default function StudentScoreCard() {
  const { personId } = useParams();
  const { orgId, organization } = useOrg();
  const { canWrite } = useRole();
  const track = organization?.track || 'HIGH_SCHOOL';
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

  const saveChanges = async (payload) => {
    try {
      await updatePerson(personId, payload, orgId);
      setEditing(false); setReloadKey(k => k + 1);
    } catch (e) { setError(e.message); }
  };

  if (!orgId) return null;
  const hasGuardian = person && (person.guardian_name || person.guardian_phone || person.guardian_contact);

  return (
    <div className="space-y-4">
      <Link to="/people" className="text-sm text-primary hover:underline">← Back to people</Link>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {!person ? <p className="text-muted-foreground">Loading…</p> : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">{person.full_name}</h1>
              <p className="text-sm text-muted-foreground">ID {person.person_id} · <Badge variant="outline">{person.status}</Badge></p>
            </div>
            {canWrite && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</Button>
                {track === 'HIGH_SCHOOL' && <Button variant="outline" onClick={() => setMoving(true)}>Move class</Button>}
              </div>
            )}
          </div>

          {editing ? (
            <PersonForm track={track} person={person} classes={classes} trades={trades}
              onSave={saveChanges} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Gender:</span> {person.gender || '—'}</p>
                    <p><span className="text-muted-foreground">Date of birth:</span> {person.date_of_birth || '—'}</p>
                    {track === 'HIGH_SCHOOL' && <p><span className="text-muted-foreground">Class:</span> {person.class_id || '—'} · <span className="text-muted-foreground">Trade:</span> {person.trade_id || '—'}</p>}
                    <p><span className="text-muted-foreground">Joined:</span> {person.date_joined || '—'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Parent / guardian</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {hasGuardian ? (
                      <>
                        <p><span className="text-muted-foreground">Name:</span> {person.guardian_name || '—'}</p>
                        <p><span className="text-muted-foreground">Phone:</span> {person.guardian_phone || '—'}</p>
                        {person.guardian_contact && <p><span className="text-muted-foreground">Other contact:</span> {person.guardian_contact}</p>}
                      </>
                    ) : <p className="text-muted-foreground">Guardian information not added.</p>}
                  </CardContent>
                </Card>
              </div>
              {track === 'HIGH_SCHOOL' && <DisciplineCard person={person} />}
              <Card>
                <CardHeader><CardTitle>Incident history</CardTitle></CardHeader>
                <CardContent>
                  {incidents.length === 0 ? <p className="text-sm text-muted-foreground">No incidents recorded. A clean record.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4 font-medium">Violation</th><th className="py-2 pr-4 font-medium">Term</th>
                          <th className="py-2 pr-4 font-medium">Date</th><th className="py-2 pr-4 font-medium">Marks</th>
                          <th className="py-2 font-medium">Status</th>
                        </tr></thead>
                        <tbody>
                          {incidents.map(r => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-2 pr-4">{r.violation_name || r.reason || '—'}</td>
                              <td className="py-2 pr-4">{r.term}</td>
                              <td className="py-2 pr-4">{r.incident_date}</td>
                              <td className="py-2 pr-4">{r.marks_deducted}</td>
                              <td className="py-2"><Badge variant="outline">{r.status}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
      {moving && person && (
        <MoveClassDialog orgId={orgId} person={person}
          onMoved={() => { setMoving(false); setReloadKey(k => k + 1); }}
          onClose={() => setMoving(false)} />
      )}
    </div>
  );
}
