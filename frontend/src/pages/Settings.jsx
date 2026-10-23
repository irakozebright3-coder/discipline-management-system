import { useEffect, useState } from 'react';
import { useOrg, useRole, ROLE_LABELS } from '../hooks/useOrg.jsx';
import { getInstitutionSettings, updateInstitutionSettings, listMembers, inviteMember, updateMember, removeMember } from '../lib/api.js';
import SearchBar from '../components/SearchBar.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Select } from '../components/ui/select.jsx';

const ASSIGNABLE = ['institution_admin', 'disciplinary_officer', 'reviewer', 'staff', 'auditor'];

export default function Settings() {
  const { orgId, organization, membership } = useOrg();
  const { isAdmin } = useRole();
  const [settings, setSettings] = useState(null);
  const [membersData, setMembersData] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviteLink, setInviteLink] = useState('');
  const [startingMarks, setStartingMarks] = useState(40);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [s, m] = await Promise.all([
        getInstitutionSettings(orgId).catch(() => ({ data: {} })),
        listMembers(orgId).catch(() => ({ data: { members: [], invitations: [] } }))
      ]);
      setSettings(s.data?.settings || {});
      const rules = (s.data?.rules || [])[0];
      if (rules?.starting_marks) setStartingMarks(rules.starting_marks);
      setMembersData(m.data || { members: [], invitations: [] });
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { if (orgId) load(); }, [orgId]);

  const saveScoring = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      await updateInstitutionSettings(orgId, { starting_marks: Number(startingMarks), max_annual: Number(startingMarks) * 3 });
      setNotice('Scoring rules saved.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const invite = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice(''); setInviteLink('');
    try {
      const { data } = await inviteMember(orgId, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      if (data.invite_link) setInviteLink(`${window.location.origin}${data.invite_link}`);
      else setNotice('Member added directly (their account already exists).');
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const changeMember = async (m, changes) => {
    setError(''); setNotice('');
    try { await updateMember(orgId, m.id, changes); await load(); }
    catch (e) { setError(e.message); }
  };
  const remove = async (m) => {
    if (!window.confirm(`Remove ${m.full_name || m.email} from this institution?`)) return;
    setError('');
    try { await removeMember(orgId, m.id); await load(); }
    catch (e) { setError(e.message); }
  };

  const needle = memberSearch.trim().toLowerCase();
  const members = (membersData?.members || []).filter(m => !needle ||
    [m.full_name, m.email, m.role].filter(Boolean).join(' ').toLowerCase().includes(needle));
  const invitations = (membersData?.invitations || []).filter(i => !needle ||
    [i.email, i.role, i.status].join(' ').toLowerCase().includes(needle));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}
      <Card>
        <CardHeader><CardTitle>Institution</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Name:</span> {organization?.name}</p>
          <p><span className="text-muted-foreground">Type:</span> {organization?.type} · {organization?.track}</p>
          <p><span className="text-muted-foreground">Your role:</span> {ROLE_LABELS[membership?.role] || membership?.role}</p>
          <p><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{organization?.status}</Badge></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Scoring rules</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5"><Label htmlFor="sm">Starting marks per term</Label>
              <Input id="sm" type="number" min="1" max="1000" className="max-w-[140px]" value={startingMarks}
                disabled={!isAdmin} onChange={e => setStartingMarks(e.target.value)} /></div>
            <p className="text-sm text-muted-foreground">Annual total: {Number(startingMarks) * 3}</p>
            {isAdmin && <Button size="sm" disabled={busy} onClick={saveScoring}>Save</Button>}
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle>Invite a member</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5"><Label htmlFor="ie">Email</Label>
                <Input id="ie" type="email" required className="max-w-xs" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="ir">Role</Label>
                <Select id="ir" className="max-w-[200px]" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  {ASSIGNABLE.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </Select></div>
              <Button type="submit" disabled={busy}>Invite</Button>
            </form>
            {inviteLink && (
              <div className="mt-3 rounded-md bg-muted p-3 text-sm">
                <p className="mb-1 font-medium">Share this invite link (valid for 7 days):</p>
                <code className="break-all text-primary">{inviteLink}</code>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Members</CardTitle>
          <SearchBar value={memberSearch} onChange={setMemberSearch} placeholder="Search members…" ariaLabel="Search members" />
        </CardHeader>
        <CardContent>
          {!membersData ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Name</th><th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th><th className="py-2 pr-4 font-medium">Status</th>
                  {isAdmin && <th className="py-2 font-medium"></th>}
                </tr></thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{m.full_name || '—'}</td>
                      <td className="py-2 pr-4">{m.email || '—'}</td>
                      <td className="py-2 pr-4">
                        {isAdmin ? (
                          <Select className="h-8 w-44 text-xs" value={m.role} onChange={e => changeMember(m, { role: e.target.value })} aria-label={`Role for ${m.full_name || m.email}`}>
                            {ASSIGNABLE.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </Select>
                        ) : <Badge variant="outline">{ROLE_LABELS[m.role] || m.role}</Badge>}
                      </td>
                      <td className="py-2 pr-4"><Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge></td>
                      {isAdmin && (
                        <td className="py-2 space-x-2">
                          <button className="text-xs text-primary hover:underline"
                            onClick={() => changeMember(m, { status: m.status === 'active' ? 'suspended' : 'active' })}>
                            {m.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>
                          {m.user_id !== membership?.user_id && (
                            <button className="text-xs text-destructive hover:underline" onClick={() => remove(m)}>Remove</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {members.length === 0 && <tr><td colSpan="5" className="py-4 text-center text-muted-foreground">No members match.</td></tr>}
                </tbody>
              </table>
              {invitations.length > 0 && (
                <>
                  <h4 className="mb-1 mt-4 text-sm font-semibold">Pending invitations</h4>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Email</th><th className="py-2 pr-4 font-medium">Role</th><th className="py-2 font-medium">Status</th>
                    </tr></thead>
                    <tbody>
                      {invitations.map(i => (
                        <tr key={i.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{i.email}</td>
                          <td className="py-2 pr-4">{ROLE_LABELS[i.role] || i.role}</td>
                          <td className="py-2"><Badge variant="outline">{i.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
