import { useEffect, useState } from 'react';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import {
  listIncidents, createIncident, getIncident, updateIncident, deleteIncident,
  listPeople, listCategories, listMembers,
  assignCase, addCaseReview, decideCase, addCaseAppeal, resolveAppeal,
  closeCase, reopenCase, addFollowUp, updateFollowUp, addCorrectiveAction, updateCorrectiveAction,
  uploadEvidence, evidenceUrl
} from '../lib/api.js';
import SearchBar from '../components/SearchBar.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Select } from '../components/ui/select.jsx';
import { Textarea } from '../components/ui/textarea.jsx';
import { Label } from '../components/ui/label.jsx';
import { Badge } from '../components/ui/badge.jsx';

const STATUSES = ['submitted', 'under_review', 'awaiting_decision', 'resolved', 'appealed', 'closed'];
const SEVERITIES = ['minor', 'moderate', 'serious', 'not_applicable'];
const STATUS_COLORS = { resolved: 'default', closed: 'secondary', appealed: 'destructive' };

export default function Incidents() {
  const { orgId, organization } = useOrg();
  const { isAdmin, canWrite, canReport, canDecide, role } = useRole();
  const track = organization?.track || 'HIGH_SCHOOL';
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [people, setPeople] = useState([]);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ person_id: '', category_id: '', incident_date: '', severity: 'minor', description: '', location: '', term: 1, status: 'submitted' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = async (p = page) => {
    try {
      const res = await listIncidents(orgId, {
        search, status: statusFilter || undefined, severity: severityFilter || undefined, page: p, limit: 25
      });
      setRows(res.data); setTotal(res.total); setPage(p);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, c, m] = await Promise.all([
          listPeople(orgId, { limit: 100 }),
          listCategories(orgId),
          listMembers(orgId).catch(() => ({ data: { members: [] } }))
        ]);
        if (cancelled) return;
        setPeople(p.data);
        setCategories((c.data || []).filter(x => x.active !== false));
        setMembers(m.data?.members || []);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  useEffect(() => { if (orgId) load(1); }, [orgId, search, statusFilter, severityFilter]);

  const addIncident = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { institution_id: orgId, person_id: form.person_id,
        incident_date: form.incident_date, description: form.description,
        severity: form.severity, status: form.status, term: Number(form.term) || null };
      if (form.category_id) payload.category_id = form.category_id;
      if (form.location) payload.location = form.location;
      await createIncident(payload);
      setAdding(false); setNotice('Case recorded.');
      setForm({ person_id: '', category_id: '', incident_date: '', severity: 'minor', description: '', location: '', term: 1, status: 'submitted' });
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const openDetail = async (id) => {
    setError('');
    try { const { data } = await getIncident(id); setDetail(data); }
    catch (e) { setError(e.message); }
  };
  const refreshDetail = async (id) => {
    const { data } = await getIncident(id);
    setDetail(data);
    await load();
  };

  const remove = async (i) => {
    if (!window.confirm(`Delete case ${i.case_number}? This cannot be undone.`)) return;
    setError(''); setNotice('');
    try { await deleteIncident(i.id); setNotice('Case deleted.'); await load(); }
    catch (err) { setError(err.message); }
  };

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cases</h1>
        {canReport && <Button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Record a case'}</Button>}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}

      {adding && (
        <form onSubmit={addIncident} className="grid gap-4 rounded-lg border bg-card p-6 shadow-sm md:grid-cols-2">
          <div className="space-y-1.5"><Label>Person</Label>
            <Select required value={form.person_id} onChange={e => set('person_id', e.target.value)}>
              <option value="">Select person…</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.person_id})</option>)}
            </Select></div>
          <div className="space-y-1.5"><Label>Category</Label>
            <Select value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">None</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.default_deduction ? ` (−${c.default_deduction})` : ''}</option>)}
            </Select></div>
          <div className="space-y-1.5"><Label>Date</Label>
            <Input type="date" required value={form.incident_date} onChange={e => set('incident_date', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Severity</Label>
            <Select value={form.severity} onChange={e => set('severity', e.target.value)}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select></div>
          {track === 'HIGH_SCHOOL' && <div className="space-y-1.5"><Label>Term</Label>
            <Select value={form.term} onChange={e => set('term', e.target.value)}>
              {[1, 2, 3].map(t => <option key={t} value={t}>Term {t}</option>)}
            </Select></div>}
          {track === 'HIGH_SCHOOL' && <div className="space-y-1.5"><Label>Save as</Label>
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="submitted">Submit for review</option>
              <option value="draft">Keep as draft</option>
            </Select></div>}
          <div className="space-y-1.5"><Label>Location (optional)</Label>
            <Input value={form.location} onChange={e => set('location', e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Description</Label>
            <Textarea required value={form.description} onChange={e => set('description', e.target.value)} placeholder="What happened…" /></div>
          <div className="flex justify-end md:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save case'}</Button></div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search case number, person, description…" ariaLabel="Search cases" className="max-w-sm" />
        <Select className="max-w-[170px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select className="max-w-[160px]" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} aria-label="Filter by severity">
          <option value="">All severities</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">{total} {total === 1 ? 'case' : 'cases'}</span>
      </div>

      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Case</th><th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Person</th><th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Severity</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium"></th>
            </tr></thead>
            <tbody>
              {rows.map(i => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3"><button className="font-medium text-primary hover:underline" onClick={() => openDetail(i.id)}>{i.case_number}</button></td>
                  <td className="p-3">{i.incident_date}</td>
                  <td className="p-3">{i.person_name} ({i.person_code})</td>
                  <td className="p-3">{i.category_label || '—'}</td>
                  <td className="p-3">{i.severity}</td>
                  <td className="p-3"><Badge variant={STATUS_COLORS[i.status] || 'outline'}>{i.status}</Badge></td>
                  <td className="p-3">{isAdmin && <button className="text-sm text-destructive hover:underline" onClick={() => remove(i)}>Delete</button>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-muted-foreground">No cases found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</Button>
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next</Button>
        </div>
      )}

      {detail && <CaseDetail caseData={detail} orgId={orgId} role={role} isAdmin={isAdmin} canWrite={canWrite} canDecide={canDecide} members={members} onClose={() => setDetail(null)} onChanged={() => refreshDetail(detail.id)} />}
    </div>
  );
}

function CaseDetail({ caseData, isAdmin, canWrite, canDecide, members, onClose, onChanged }) {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewOutcome, setReviewOutcome] = useState('needs_more_info');
  const [decision, setDecision] = useState('approved');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [decisionMarks, setDecisionMarks] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [actionText, setActionText] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  const act = async (fn, ok) => {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); setNotice(ok); onChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 md:p-8" role="dialog" aria-label={`Case ${caseData.case_number}`}>
      <div className="w-full max-w-3xl space-y-4 rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{caseData.case_number}</h2>
            <p className="text-sm text-muted-foreground">
              {caseData.person?.full_name} ({caseData.person?.person_id}) · {caseData.incident_date} · {caseData.category_name || 'No category'} · <Badge variant="outline">{caseData.status}</Badge>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">Close</Button>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {notice && <p className="text-sm text-primary">{notice}</p>}
        {caseData.description && <p className="rounded-md bg-muted p-3 text-sm">{caseData.description}</p>}

        {/* Workflow actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Actions</h3>
          <div className="flex flex-wrap gap-2">
            {canWrite && caseData.status === 'submitted' && (
              <div className="flex flex-wrap items-center gap-2">
                <Select className="max-w-[220px]" value={assignTo} onChange={e => setAssignTo(e.target.value)} aria-label="Assign to officer">
                  <option value="">Assign to…</option>
                  {members.map(m => <option key={m.id} value={m.user_id}>{m.full_name || m.email} ({m.role})</option>)}
                </Select>
                <Button size="sm" disabled={busy || !assignTo} onClick={() => act(() => assignCase(caseData.id, { officer_user_id: assignTo, note: 'Assigned from case view' }), 'Case assigned.')}>Assign</Button>
              </div>
            )}
            {canWrite && ['submitted', 'under_review', 'awaiting_decision'].includes(caseData.status) && (
              <div className="flex flex-wrap items-center gap-2">
                <Input className="max-w-xs" placeholder="Review notes…" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} />
                <Select className="max-w-[190px]" value={reviewOutcome} onChange={e => setReviewOutcome(e.target.value)} aria-label="Review outcome">
                  <option value="needs_more_info">Needs more info</option>
                  <option value="recommend_approval">Recommend approval</option>
                  <option value="recommend_dismissal">Recommend dismissal</option>
                </Select>
                <Button size="sm" disabled={busy || !reviewNotes} onClick={() => act(() => addCaseReview(caseData.id, { notes: reviewNotes, outcome: reviewOutcome }), 'Review recorded.')}>Save review</Button>
              </div>
            )}
            {canDecide && ['under_review', 'awaiting_decision'].includes(caseData.status) && (
              <div className="flex flex-wrap items-center gap-2">
                <Select className="max-w-[160px]" value={decision} onChange={e => setDecision(e.target.value)} aria-label="Decision">
                  <option value="approved">Approve (deduct)</option>
                  <option value="dismissed">Dismiss</option>
                  <option value="escalated">Escalate</option>
                </Select>
                <Input className="max-w-[140px]" type="number" min="0" placeholder="Marks (default)" value={decisionMarks} onChange={e => setDecisionMarks(e.target.value)} />
                <Input className="max-w-xs" placeholder="Rationale…" value={decisionRationale} onChange={e => setDecisionRationale(e.target.value)} />
                <Button size="sm" disabled={busy || !decisionRationale} onClick={() => act(() => decideCase(caseData.id, {
                  decision, rationale: decisionRationale,
                  ...(decisionMarks !== '' ? { deduction_override: Number(decisionMarks) } : {})
                }), 'Decision recorded.')}>Decide</Button>
              </div>
            )}
            {canWrite && caseData.status === 'resolved' && (
              <div className="flex flex-wrap items-center gap-2">
                <Input className="max-w-xs" placeholder="Reason for appeal…" value={appealReason} onChange={e => setAppealReason(e.target.value)} />
                <Button size="sm" disabled={busy || !appealReason} onClick={() => act(() => addCaseAppeal(caseData.id, { reason: appealReason }), 'Appeal recorded.')}>Record appeal</Button>
              </div>
            )}
            {canDecide && caseData.status === 'appealed' && (caseData.appeals || []).filter(a => a.status === 'submitted').map(a => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                <span className="text-xs text-muted-foreground">Appeal: {a.reason}</span>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => resolveAppeal(caseData.id, a.id, { status: 'overturned', outcome: 'Overturned on review' }), 'Appeal overturned, deduction reversed.')}>Overturn</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => resolveAppeal(caseData.id, a.id, { status: 'rejected', outcome: 'Appeal rejected' }), 'Appeal rejected.')}>Reject</Button>
              </div>
            ))}
            {canDecide && caseData.status === 'resolved' && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => closeCase(caseData.id), 'Case closed.')}>Close case</Button>
            )}
            {canDecide && caseData.status === 'closed' && (
              <div className="flex flex-wrap items-center gap-2">
                <Input className="max-w-xs" placeholder="Reason to reopen…" value={reopenReason} onChange={e => setReopenReason(e.target.value)} />
                <Button size="sm" variant="outline" disabled={busy || !reopenReason} onClick={() => act(() => reopenCase(caseData.id, reopenReason), 'Case reopened.')}>Reopen</Button>
              </div>
            )}
            {canWrite && !['closed'].includes(caseData.status) && (
              <div className="flex flex-wrap items-center gap-2">
                <Input className="max-w-xs" placeholder="Follow-up title…" value={followUpTitle} onChange={e => setFollowUpTitle(e.target.value)} />
                <Input className="max-w-[150px]" type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                <Button size="sm" variant="outline" disabled={busy || !followUpTitle} onClick={() => act(() => addFollowUp(caseData.id, { title: followUpTitle, due_date: followUpDate || undefined }), 'Follow-up added.')}>Add follow-up</Button>
              </div>
            )}
            {canWrite && !['closed'].includes(caseData.status) && (
              <div className="flex flex-wrap items-center gap-2">
                <Input className="max-w-xs" placeholder="Corrective action…" value={actionText} onChange={e => setActionText(e.target.value)} />
                <Button size="sm" variant="outline" disabled={busy || !actionText} onClick={() => act(() => addCorrectiveAction(caseData.id, { action: actionText }), 'Corrective action added.')}>Add action</Button>
              </div>
            )}
          </div>
        </div>

        {caseData.follow_ups?.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Follow-ups</h3>
            <ul className="space-y-1 text-sm">
              {caseData.follow_ups.map(f => (
                <li key={f.id} className="flex items-center justify-between rounded-md border p-2">
                  <span>{f.title} <span className="text-muted-foreground">· due {f.due_date || '—'}</span></span>
                  {f.status !== 'completed' && canWrite && (
                    <button className="text-xs text-primary hover:underline" disabled={busy}
                      onClick={() => act(() => updateFollowUp(caseData.id, f.id, { status: 'completed' }), 'Follow-up completed.')}>Mark done</button>
                  )}
                  {f.status === 'completed' && <Badge variant="secondary">done</Badge>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {caseData.corrective_actions?.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Corrective actions</h3>
            <ul className="space-y-1 text-sm">
              {caseData.corrective_actions.map(a => (
                <li key={a.id} className="flex items-center justify-between rounded-md border p-2">
                  <span>{a.action}</span>
                  {a.status !== 'completed' && canWrite && (
                    <button className="text-xs text-primary hover:underline" disabled={busy}
                      onClick={() => act(() => updateCorrectiveAction(caseData.id, a.id, { status: 'completed' }), 'Action completed.')}>Mark done</button>
                  )}
                  {a.status === 'completed' && <Badge variant="secondary">done</Badge>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <EvidenceBlock caseData={caseData} canReport={canWrite} busy={busy} act={act} />

        {caseData.decisions?.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Decision history</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {caseData.decisions.map(d => <li key={d.id} className="rounded-md border p-2"><strong>{d.decision}</strong> by {d.actor_name || '—'}: {d.rationale}</li>)}
            </ul>
          </div>
        )}
        {caseData.reviews?.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Reviews</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {caseData.reviews.map(r => <li key={r.id} className="rounded-md border p-2"><strong>{r.outcome}</strong> by {r.actor_name || '—'}: {r.notes}</li>)}
            </ul>
          </div>
        )}
        {caseData.assignments?.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Assignments</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {caseData.assignments.map(a => <li key={a.id} className="rounded-md border p-2">To {a.actor_name || '—'}: {a.note || '—'}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceBlock({ caseData, canReport, busy, act }) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const upload = async () => {
    if (!file) return;
    const reader = new FileReader();
    const data = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
    await act(async () => {
      const { uploadEvidence } = await import('../lib/api.js');
      await uploadEvidence(caseData.id, { file_name: file.name, mime_type: file.type || 'application/octet-stream', data_base64: data, description });
    }, 'Evidence uploaded.');
    setFile(null); setDescription('');
  };
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">Evidence</h3>
      {caseData.evidence?.length > 0 && (
        <ul className="mb-2 space-y-1 text-sm">
          {caseData.evidence.map(ev => (
            <li key={ev.id} className="flex items-center justify-between rounded-md border p-2">
              <span>{ev.file_name} <span className="text-muted-foreground">({Math.round((ev.size_bytes || 0) / 1024)} KB)</span></span>
              <EvidenceLink caseId={caseData.id} evidenceId={ev.id} />
            </li>
          ))}
        </ul>
      )}
      {canReport && (
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" className="text-sm" onChange={e => setFile(e.target.files?.[0] || null)} aria-label="Evidence file" />
          <Input className="max-w-xs" placeholder="Description…" value={description} onChange={e => setDescription(e.target.value)} />
          <Button size="sm" variant="outline" disabled={busy || !file} onClick={upload}>Upload</Button>
        </div>
      )}
    </div>
  );
}

function EvidenceLink({ caseId, evidenceId }) {
  const download = async () => {
    const { evidenceUrl } = await import('../lib/api.js');
    const { data } = await evidenceUrl(caseId, evidenceId);
    window.open(data.url, '_blank');
  };
  return <button className="text-xs text-primary hover:underline" onClick={download}>Download (5 min link)</button>;
}
