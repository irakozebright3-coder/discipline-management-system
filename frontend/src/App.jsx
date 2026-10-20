import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';
import { signInWithPassword, signUpWithPassword, signOut } from './auth/auth-example.jsx';
import { listOrganizations } from './lib/api.js';
import Overview from './pages/Overview.jsx';
import Persons from './pages/Persons.jsx';
import Incidents from './pages/Incidents.jsx';
import Violations from './pages/Violations.jsx';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'persons', label: 'People' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'violations', label: 'Violations' }
];

function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (mode === 'signin') await signInWithPassword(email, password);
      else await signUpWithPassword(email, password, fullName);
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="sdms-card login-card" onSubmit={submit}>
        <h1>SDMS</h1>
        <p className="muted">Discipline Management System</p>
        {mode === 'signup' && (
          <input className="sdms-input" placeholder="Full name" value={fullName} required
            onChange={e => setFullName(e.target.value)} />
        )}
        <input className="sdms-input" type="email" placeholder="Email" value={email} required
          onChange={e => setEmail(e.target.value)} />
        <input className="sdms-input" type="password" placeholder="Password" minLength={6} value={password} required
          onChange={e => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button className="sdms-liquid" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
          {mode === 'signin' ? 'No account yet? Sign up' : 'Already registered? Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(() => localStorage.getItem('sdms.org') || '');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) { setOrgs([]); setActiveOrgId(''); localStorage.removeItem('sdms.org'); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    listOrganizations()
      .then(({ data }) => {
        setOrgs(data || []);
        const stillValid = (data || []).some(m => m.organization.id === activeOrgId);
        if (!stillValid && data?.length) {
          setActiveOrgId(data[0].organization.id);
          localStorage.setItem('sdms.org', data[0].organization.id);
        }
      })
      .catch(() => setOrgs([]));
  }, [session?.user?.id]);

  if (!ready) return <div className="center muted">Loading…</div>;
  if (!session) return <Login />;

  const membership = orgs.find(m => m.organization.id === activeOrgId);
  const isAdmin = membership && ['org_admin', 'platform_owner'].includes(membership.role);
  const canWrite = membership && ['org_admin', 'platform_owner', 'teacher', 'staff'].includes(membership.role);
  const orgId = membership?.organization.id;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">SDMS</span>
        <select className="sdms-input org-select" value={orgId || ''} onChange={e => {
          setActiveOrgId(e.target.value); localStorage.setItem('sdms.org', e.target.value);
        }}>
          {orgs.length === 0 && <option value="">No organization yet</option>}
          {orgs.map(m => (
            <option key={m.organization.id} value={m.organization.id}>
              {m.organization.name} ({m.role})
            </option>
          ))}
        </select>
        <nav className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <button className="link" onClick={signOut}>Sign out</button>
      </header>

      {orgs.length === 0 ? (
        <main className="center">
          <div className="sdms-card empty-card">
            <h2>You are not in any organization yet</h2>
            <p className="muted">Ask a platform owner or organization admin to add your account,
              then refresh this page.</p>
          </div>
        </main>
      ) : (
        <main className="content">
          {tab === 'overview' && <Overview orgId={orgId} org={membership.organization} role={membership.role} onNavigate={setTab} />}
          {tab === 'persons' && <Persons orgId={orgId} canWrite={canWrite} isAdmin={isAdmin} />}
          {tab === 'incidents' && <Incidents orgId={orgId} canWrite={canWrite} isAdmin={isAdmin} />}
          {tab === 'violations' && <Violations orgId={orgId} canWrite={isAdmin} isAdmin={isAdmin} />}
        </main>
      )}
    </div>
  );
}
