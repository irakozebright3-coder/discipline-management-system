import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { platformGet, platformDelete } from '../../lib/api.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { Button } from '../../components/ui/button.jsx';
import SearchBar from '../../components/SearchBar.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export default function PlatformUsers() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [target, setTarget] = useState(null); // user pending deletion
  const [warning, setWarning] = useState(null); // server says institutions would lose their admin
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const load = async (q = '') => {
    try {
      const { data } = await platformGet(`users${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setRows(data);
    } catch (e) { setError(e.message); }
  };
  const closeDialog = () => { setTarget(null); setWarning(null); setDialogError(''); };
  const remove = async (confirm = false) => {
    setBusy(true); setDialogError('');
    try {
      await platformDelete(`users/${target.id}${confirm ? '?confirm=true' : ''}`);
      setNotice(`Deleted ${target.email}.`);
      setRows(r => (r || []).filter(u => u.id !== target.id));
      closeDialog();
    } catch (e) {
      // The server asks for a second, explicit confirmation when an institution would be left with no admin.
      if (/no administrator/i.test(e.message) && !confirm) setWarning(e.message);
      else setDialogError(e.message);
    } finally { setBusy(false); }
  };
  useEffect(() => { load(''); }, []);
  useEffect(() => { if (rows) load(search); }, [search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">Every registered account on the platform.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300" role="status">{notice}</p>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search name or email…" ariaLabel="Search users" className="max-w-sm" />
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Institutions</th><th className="p-3 font-medium">Owner</th>
              <th className="p-3 font-medium">Joined</th><th className="p-3 font-medium text-right">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{u.full_name || '—'}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.memberships}</td>
                  <td className="p-3">{u.is_owner && <Badge>Platform owner</Badge>}</td>
                  <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    {u.is_owner ? <span className="text-xs text-muted-foreground">Protected</span> : (
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setNotice(''); setTarget(u); }} aria-label={`Delete account ${u.email}`}><Trash2 size={14} /> Delete</Button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-muted-foreground">No users match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {target && (
        <ConfirmDialog
          title={warning ? 'Leave an institution without an admin?' : 'Delete this account?'}
          confirmLabel={warning ? 'Delete anyway' : 'Delete account'}
          busy={busy} error={dialogError}
          onCancel={closeDialog}
          onConfirm={() => remove(!!warning)}
        >
          {warning ? <p>{warning} Its data stays, but nobody will be able to manage it until another admin is added.</p> : (
            <>
              <p><b className="text-foreground">{target.full_name || target.email}</b> ({target.email}) will lose access immediately and cannot sign in again.</p>
              <p>Cases, people and records they created are kept. Only their membership of institutions is removed. This cannot be undone.</p>
            </>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
