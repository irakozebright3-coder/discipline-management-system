import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import { getPerson, getPersonScores, listIncidents, updatePerson, listStructureNodes, adjustScore } from '../lib/api.js';
import PersonForm from '../components/PersonForm.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';

export default function StudentScoreCard() {
  const { personId } = useParams();
  const { orgId, organization } = useOrg();
  const { canWrite, isAdmin } = useRole();
  const track = organization?.track || 'HIGH_SCHOOL';
  const isHS = track === 'HIGH_SCHOOL';
  const [person, setPerson] = useState(null);
  const [scores, setScores] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [adjust, setAdjust] = useState(null); // { term, amount, note }
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!orgId || !personId) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, s, i, u] = await Promise.all([
          getPerson(personId, orgId),
          getPersonScores(personId, orgId),
          listIncidents(orgId, { person_id: personId, limit: 100 }),
          listStructureNodes(orgId).catch(() => ({ data: [] }))
        ]);
        if (cancelled) return;
        setPerson(p.data); setScores(s.data); setIncidents(i.data || []); setUnits(u.data || []);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId, personId, reloadKey]);

  const saveChanges = async (payload) => {
    setError(''); setNotice('');
    try {
      await updatePerson(personId, payload, orgId);
      setEditing(false); setNotice('Profile saved.'); setReloadKey(k => k + 1);
    } catch (e) { setError(e.message); }
  };

  const applyAdjustment = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      await adjustScore({ institution_id: orgId, person_id: personId, term: adjust.term, amount: Number(adjust.amount), note: adjust.note });
      setAdjust(null); setNotice('Adjustment recorded.'); setReloadKey(k => k + 1);
    } catch (err) { setError(err.message); }
  };

  const needle = search.trim().toLowerCase();
  const rows = incidents.filter(r => !needle ||
    [r.case_number, r.category_label, r.description, r.severity, r.status].filter(Boolean).join(' ').toLowerCase().includes(needle));
  const unitName = (id) => units.find(u => u.id === id)?.name || '';

  return (
    <div className="space-y-4">
      <Link to="/people" className="text-sm text-primary hover:underline">← Back to people</Link>
      {!person ? <p className="text-muted-foreground">{error || 'Loading…'}</p> : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">{person.full_name}</h1>
              <p className="text-sm text-muted-foreground">ID {person.person_id} · <Badge variant="outline">{person.status}</Badge> · {person.person_type}</p>
            </div>
            {canWrite && (
              <Button variant="outline" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</Button>
            )}
          </div>
          {notice && <p className="text-sm text-primary">{notice}</p>}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          {editing ? (
            <PersonForm track={track} person={person} units={units} onSave={saveChanges} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Gender:</span> {person.gender || '—'}</p>
                    <p><span className="text-muted-foreground">Date of birth:</span> {person.date_of_birth || '—'}</p>
                    {isHS && <p><span className="text-muted-foreground">Class:</span> {unitName(person.class_unit_id) || '—'} · <span className="text-muted-foreground">Trade:</span> {unitName(person.trade_unit_id) || '—'}</p>}
                    <p><span className="text-muted-foreground">Joined:</span> {new Date(person.created_at).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Parent / guardian</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {person.guardian_name || person.guardian_phone ? (
                      <>
                        <p><span className="text-muted-foreground">Name:</span> {person.guardian_name || '—'}</p>
                        <p><span className="text-muted-foreground">Phone:</span> {person.guardian_phone || '—'}</p>
                        {person.guardian_contact && <p><span className="text-muted-foreground">Other contact:</span> {person.guardian_contact}</p>}
                      </>
                    ) : <p className="text-muted-foreground">Guardian information not added.</p>}
                  </CardContent>
                </Card>
              </div>

              {isHS && scores && (
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>Discipline marks</CardTitle>
                    {isAdmin && <span className="text-xs text-muted-foreground">Annual: {scores.annual?.marks}/{scores.annual?.max} ({scores.annual?.percentage}%)</span>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      {(scores.terms || []).map(t => (
                        <div key={t.term} className="rounded-md border p-3">
                          <p className="text-sm font-medium">Term {t.term}</p>
                          <p className="text-2xl font-bold text-primary">{t.remaining}<span className="text-sm text-muted-foreground">/{t.starting_marks}</span></p>
                          <p className="text-xs text-muted-foreground">{t.percentage}% remaining</p>
                          {t.pending_deductions > 0 && <p className="mt-1 text-xs text-destructive">{t.pending_deductions} pending</p>}
                          {isAdmin && (
                            <button className="mt-1 text-xs text-primary hover:underline"
                              onClick={() => setAdjust({ term: t.term, amount: '', note: '' })}>Adjust…</button>
                          )}
                        </div>
                      ))}
                    </div>
                    {adjust && (
                      <form onSubmit={applyAdjustment} className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/50 p-3">
                        <div><label className="text-xs text-muted-foreground">Term {adjust.term} deduction</label>
                          <Input type="number" min="0" step="0.5" className="max-w-[120px]" required value={adjust.amount} onChange={e => setAdjust(a => ({ ...a, amount: e.target.value }))} /></div>
                        <Input className="max-w-xs" required placeholder="Reason (documented)" value={adjust.note} onChange={e => setAdjust(a => ({ ...a, note: e.target.value }))} />
                        <Button size="sm" type="submit">Apply</Button>
                        <Button size="sm" type="button" variant="ghost" onClick={() => setAdjust(null)}>Cancel</Button>
                      </form>
                    )}
                    {(scores.transactions || []).length > 0 && (
                      <div>
                        <h4 className="mb-1 text-sm font-semibold">Mark transactions</h4>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {scores.transactions.map(t => (
                            <li key={t.id} className="flex items-center justify-between rounded border bg-background p-2">
                              <span>{t.kind} {t.amount} (term {t.term}) · {t.status} · {t.case?.case_number || 'manual'} · {t.note || ''}</span>
                              <Badge variant="outline">{new Date(t.created_at).toLocaleDateString()}</Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>Case history</CardTitle>
                  <SearchBar value={search} onChange={setSearch} placeholder="Search this person's cases…" ariaLabel="Search person cases" />
                </CardHeader>
                <CardContent>
                  {rows.length === 0 ? <p className="text-sm text-muted-foreground">No cases found. A clean record.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4 font-medium">Case</th><th className="py-2 pr-4 font-medium">Category</th><th className="py-2 pr-4 font-medium">Term</th>
                          <th className="py-2 pr-4 font-medium">Date</th><th className="py-2 pr-4 font-medium">Marks</th>
                          <th className="py-2 font-medium">Status</th>
                        </tr></thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium text-primary">{r.case_number}</td>
                              <td className="py-2 pr-4">{r.category_label || '—'}</td>
                              <td className="py-2 pr-4">{r.term || '—'}</td>
                              <td className="py-2 pr-4">{r.incident_date}</td>
                              <td className="py-2 pr-4">{r.marks_deducted ?? '—'}</td>
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
    </div>
  );
}
