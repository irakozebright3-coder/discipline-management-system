import { useEffect, useState } from 'react';
import { platformGet, platformPost, platformPatch, platformDelete } from '../lib/api.js';
import LiquidButton from '../components/LiquidButton.jsx';

const SECTIONS = [['dashboard', 'Dashboard'], ['users', 'Users'], ['audit', 'Audit logs'], ['backups', 'Backups'], ['content', 'Content']];

export default function PlatformView() {
  const [section, setSection] = useState('dashboard');
  const [dash, setDash] = useState(null);
  const [users, setUsers] = useState(null);
  const [plogs, setPlogs] = useState(null);
  const [ologs, setOlogs] = useState(null);
  const [backups, setBackups] = useState(null);
  const [config, setConfig] = useState(null);
  const [creator, setCreator] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newContributor, setNewContributor] = useState({ name: '', role: '', contribution: '' });
  const [newArticle, setNewArticle] = useState({ category: 'Getting started', title: '', content: '' });

  async function loadDash() {
    try {
      const d = (await platformGet('dashboard')).data;
      setDash(d); setConfig(d.config);
      const c = (await platformGet('creator-profile').catch(() => ({ data: null }))).data;
      setCreator(c);
    } catch (e) { setError(e.message); }
  }

  async function loadSection() {
    setError('');
    try {
      if (section === 'users') setUsers((await platformGet('users')).data);
      if (section === 'audit') {
        setPlogs((await platformGet('audit-logs')).data);
        setOlogs((await platformGet('org-audit-logs')).data);
      }
      if (section === 'backups') setBackups((await platformGet('backups')).data);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { loadDash(); }, []);
  useEffect(() => { loadSection(); }, [section]);

  async function createBackup(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await platformPost('backups', { name: newBackupName || `Backup ${new Date().toLocaleString()}`, status: 'Completed', size: 'auto' });
      setNewBackupName('');
      await loadSection();
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  }

  async function removeBackup(id) {
    try { await platformDelete(`backups/${id}`); await loadSection(); } catch (e) { setError(e.message); }
  }

  async function toggleMaintenance() {
    try {
      const { data } = await platformPatch('config', { maintenance_mode: !config.maintenance_mode });
      setConfig(data); setDash(d => ({ ...d, config: data }));
    } catch (e) { setError(e.message); }
  }

  async function saveCreator(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await platformPatch('creator-profile', creator);
      setCreator(data);
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  }

  async function addContributor(e) {
    e.preventDefault();
    if (!newContributor.name.trim()) return;
    setBusy(true);
    try {
      await platformPost('contributors', { ...newContributor, name: newContributor.name.trim() });
      setNewContributor({ name: '', role: '', contribution: '' });
      await loadDash();
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  }

  async function addArticle(e) {
    e.preventDefault();
    if (!newArticle.title.trim()) return;
    setBusy(true);
    try {
      await platformPost('help-articles', newArticle);
      setNewArticle({ category: 'Getting started', title: '', content: '' });
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  }

  return (
    <section className="view">
      <h2 className="page-title">Platform owner console</h2>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="filter-row">
        {SECTIONS.map(([id, label]) => (
          <button key={id} className={`tab${section === id ? ' active' : ''}`} onClick={() => setSection(id)}>{label}</button>
        ))}
      </div>

      {section === 'dashboard' && (
        <>
          {dash ? (
            <div className="stats-row">
              <div className="card stat"><span className="muted">Organizations</span><strong>{dash.counts.organizations}</strong></div>
              <div className="card stat"><span className="muted">Users</span><strong>{dash.counts.users}</strong></div>
              <div className="card stat"><span className="muted">People</span><strong>{dash.counts.people}</strong></div>
              <div className="card stat"><span className="muted">Incidents</span><strong>{dash.counts.incidents}</strong></div>
              <div className="card stat"><span className="muted">Visits</span><strong>{dash.counts.visitors}</strong></div>
            </div>
          ) : (
            <p className="muted">Loading…</p>
          )}
          {config && (
            <div className="card">
              <h3>System</h3>
              <p><span className="muted">Version:</span> {config.system_version} · <span className="muted">Health:</span> {config.system_health}</p>
              <p className="row-between"><span className="muted">Maintenance mode</span>
                <LiquidButton onClick={toggleMaintenance}>{config.maintenance_mode ? 'Turn off' : 'Turn on'}</LiquidButton>
              </p>
            </div>
          )}
          {dash?.organizations?.length > 0 && (
            <div className="card">
              <h3>Organizations</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead>
                  <tbody>
                    {dash.organizations.map(o => (
                      <tr key={o.id}>
                        <td>{o.name}</td><td>{o.type}</td>
                        <td><span className="pill">{o.suspended ? 'Suspended' : 'Active'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {section === 'users' && (
        users ? (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Joined</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}><td>{u.full_name || u.id}</td><td>{new Date(u.created_at).toLocaleDateString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <p className="muted">Loading…</p>
      )}

      {section === 'audit' && (
        <>
          {plogs ? (
            <div className="card">
              <h3>Platform audit</h3>
              {plogs.length === 0 ? (
                <p className="muted">No platform actions recorded.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>When</th><th>Action</th><th>Target</th><th>User</th></tr></thead>
                    <tbody>
                      {plogs.map(l => (
                        <tr key={l.id}>
                          <td>{new Date(l.created_at).toLocaleString()}</td><td>{l.action}</td><td>{l.target}</td><td>{l.user_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : <p className="muted">Loading…</p>}
          {ologs && (
            <div className="card">
              <h3>Organization audit</h3>
              {ologs.length === 0 ? (
                <p className="muted">No organization actions recorded.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>When</th><th>Action</th><th>Entity</th></tr></thead>
                    <tbody>
                      {ologs.map(l => (
                        <tr key={l.id}>
                          <td>{new Date(l.created_at).toLocaleString()}</td><td>{l.action}</td><td>{l.entity_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {section === 'backups' && (
        <>
          <form className="card form-card" onSubmit={createBackup}>
            <input className="input" value={newBackupName} onChange={e => setNewBackupName(e.target.value)} placeholder="Backup name (optional)" />
            <div className="form-actions"><LiquidButton type="submit" disabled={busy}>{busy ? 'Working…' : 'Create backup record'}</LiquidButton></div>
          </form>
          {backups ? (
            <div className="card">
              {backups.length === 0 ? (
                <p className="muted">No backups recorded.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Name</th><th>Status</th><th>Created</th><th></th></tr></thead>
                    <tbody>
                      {backups.map(b => (
                        <tr key={b.id}>
                          <td>{b.name}</td><td><span className="pill">{b.status}</span></td>
                          <td>{new Date(b.created_at).toLocaleString()}</td>
                          <td><button className="link danger" onClick={() => removeBackup(b.id)}>Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : <p className="muted">Loading…</p>}
        </>
      )}

      {section === 'content' && (
        <>
          {creator && (
            <form className="card form-card" onSubmit={saveCreator}>
              <h3>Creator profile</h3>
              <input className="input" value={creator.full_name || ''} onChange={e => setCreator({ ...creator, full_name: e.target.value })} aria-label="Creator name" />
              <input className="input" value={creator.title || ''} onChange={e => setCreator({ ...creator, title: e.target.value })} aria-label="Creator title" />
              <textarea className="input" rows="3" value={creator.biography || ''} onChange={e => setCreator({ ...creator, biography: e.target.value })} aria-label="Creator biography"></textarea>
              <div className="form-actions"><LiquidButton type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</LiquidButton></div>
            </form>
          )}
          <form className="card form-card" onSubmit={addContributor}>
            <h3>Add contributor</h3>
            <input className="input" value={newContributor.name} onChange={e => setNewContributor({ ...newContributor, name: e.target.value })} placeholder="Name" required />
            <input className="input" value={newContributor.role} onChange={e => setNewContributor({ ...newContributor, role: e.target.value })} placeholder="Role (optional)" />
            <input className="input" value={newContributor.contribution} onChange={e => setNewContributor({ ...newContributor, contribution: e.target.value })} placeholder="Contribution (optional)" />
            <div className="form-actions"><LiquidButton type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add contributor'}</LiquidButton></div>
          </form>
          <form className="card form-card" onSubmit={addArticle}>
            <h3>Add help article</h3>
            <select className="input" value={newArticle.category} onChange={e => setNewArticle({ ...newArticle, category: e.target.value })} aria-label="Article category">
              <option>Getting started</option><option>Discipline marks</option><option>Reports</option><option>Account & security</option>
            </select>
            <input className="input" value={newArticle.title} onChange={e => setNewArticle({ ...newArticle, title: e.target.value })} placeholder="Title" required />
            <textarea className="input" rows="4" value={newArticle.content} onChange={e => setNewArticle({ ...newArticle, content: e.target.value })} placeholder="Content"></textarea>
            <div className="form-actions"><LiquidButton type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish article'}</LiquidButton></div>
          </form>
        </>
      )}
    </section>
  );
}
