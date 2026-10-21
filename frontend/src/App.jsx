import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';
import { signOut } from './lib/auth.js';
import { listOrganizations, platformGet } from './lib/api.js';
import LoginView from './views/LoginView.jsx';
import PublicHomeView from './views/PublicHomeView.jsx';
import AboutView from './views/AboutView.jsx';
import CommunityView from './views/CommunityView.jsx';
import HelpView from './views/HelpView.jsx';
import SetupView from './views/SetupView.jsx';
import StructureView from './views/StructureView.jsx';
import HistoryView from './views/HistoryView.jsx';
import ReportsView from './views/ReportsView.jsx';
import StudentScoreCardView from './views/StudentScoreCardView.jsx';
import SettingsView from './views/SettingsView.jsx';
import PlatformView from './views/PlatformView.jsx';
import OverviewView from './views/OverviewView.jsx';
import PeopleView from './views/PeopleView.jsx';
import IncidentsView from './views/IncidentsView.jsx';
import ViolationsView from './views/ViolationsView.jsx';
import AdminView from './views/AdminView.jsx';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'people', label: 'People' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'violations', label: 'Violations' },
  { id: 'structure', label: 'Structure' },
  { id: 'history', label: 'History' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
  { id: 'admin', label: 'Admin' },
  { id: 'platform', label: 'Platform', ownerOnly: true }
];
const PUBLIC_TABS = [
  { id: 'landing', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'community', label: 'Community' },
  { id: 'help', label: 'Help' }
];

function Footer({ year }) {
  return (
    <footer className="footer">
      <p>© {year} SDMS — Discipline Management System. All rights reserved.</p>
      <p className="muted">Built with React + Express · Every action is recorded in the audit trail</p>
    </footer>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(localStorage.getItem('sdms.org') || '');
  const [tab, setTab] = useState('landing');        // public tab when signed out
  const [appTab, setAppTab] = useState('overview'); // main app tab when signed in
  const [studentId, setStudentId] = useState('');
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [now, setNow] = useState(Date.now());
  const year = new Date(now).getFullYear();

  // Footer year: re-check the clock every 10 minutes so the copyright flips right after midnight.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 600000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) { setOrgs([]); setActiveOrgId(''); localStorage.removeItem('sdms.org'); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) { setOrgs([]); setIsPlatformOwner(false); setStudentId(''); return; }
    setAppTab('overview');
    platformGet('dashboard').then(() => setIsPlatformOwner(true)).catch(() => setIsPlatformOwner(false));
    let cancelled = false;
    (async () => {
      try {
        const { data } = await listOrganizations();
        if (cancelled) return;
        const list = data || [];
        setOrgs(list);
        if (list.length) {
          setActiveOrgId(prev => {
            const stillValid = list.some(m => m.organization.id === prev);
            const next = stillValid ? prev : list[0].organization.id;
            if (next) localStorage.setItem('sdms.org', next);
            return next;
          });
        }
      } catch { if (!cancelled) setOrgs([]); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  function chooseOrg(id) {
    setActiveOrgId(id);
    if (id) localStorage.setItem('sdms.org', id);
  }

  async function doSignOut() {
    await signOut();
    setTab('landing'); setAppTab('overview'); setIsPlatformOwner(false);
  }

  async function onOrgCreated() {
    const { data } = await listOrganizations();
    const list = data || [];
    setOrgs(list);
    if (list.length) chooseOrg(list[0].organization.id);
  }

  function openStudent(id) {
    setStudentId(id);
    setAppTab('student');
  }

  if (!ready) return <div className="center muted">Loading…</div>;

  if (!session) {
    return (
      <div className="app">
        <header className="topbar">
          <span className="brand">SDMS</span>
          <nav className="tabs" aria-label="Public navigation">
            {PUBLIC_TABS.map(t => (
              <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
            <button className={`tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Sign in</button>
          </nav>
        </header>
        <main className="content" key={tab}>
          {tab === 'landing' && <PublicHomeView onGoLogin={() => setTab('login')} />}
          {tab === 'about' && <AboutView />}
          {tab === 'community' && <CommunityView />}
          {tab === 'help' && <HelpView />}
          {tab === 'login' && <LoginView />}
        </main>
        <Footer year={year} />
      </div>
    );
  }

  const membership = orgs.find(m => m.organization.id === activeOrgId);
  const isAdmin = membership && ['org_admin', 'platform_owner'].includes(membership.role);
  const canWrite = membership && ['org_admin', 'platform_owner', 'teacher', 'staff'].includes(membership.role);
  const orgId = membership?.organization.id || '';

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">SDMS</span>
        <select className="input org-select" value={orgId} onChange={e => chooseOrg(e.target.value)}
          aria-label="Active organization">
          {orgs.length === 0 && <option value="">No organization yet</option>}
          {orgs.map(m => (
            <option key={m.organization.id} value={m.organization.id}>
              {m.organization.name} ({m.role})
            </option>
          ))}
        </select>
        <nav className="tabs" aria-label="Main navigation">
          {TABS.map(t => {
            const visible = (t.id !== 'admin' || isAdmin) && (t.id !== 'platform' || isPlatformOwner);
            if (!visible) return null;
            return (
              <button key={t.id} className={`tab${appTab === t.id ? ' active' : ''}`}
                onClick={() => setAppTab(t.id)}>{t.label}</button>
            );
          })}
        </nav>
        <button className="link" onClick={doSignOut}>Sign out</button>
      </header>

      <main className="content" key={appTab + (appTab === 'student' ? studentId : '') + orgId}>
        {orgs.length === 0 ? (
          <SetupView onCreated={onOrgCreated} />
        ) : (
          <>
            {appTab === 'overview' && <OverviewView orgId={orgId} org={membership.organization} role={membership.role} />}
            {appTab === 'people' && <PeopleView orgId={orgId} track={membership.organization.track} canWrite={canWrite} isAdmin={isAdmin} onOpenStudent={openStudent} />}
            {appTab === 'incidents' && <IncidentsView orgId={orgId} canWrite={canWrite} isAdmin={isAdmin} />}
            {appTab === 'violations' && <ViolationsView orgId={orgId} canWrite={isAdmin} />}
            {appTab === 'structure' && <StructureView orgId={orgId} track={membership.organization.track} canWrite={canWrite} isAdmin={isAdmin} />}
            {appTab === 'history' && <HistoryView orgId={orgId} />}
            {appTab === 'reports' && <ReportsView orgId={orgId} track={membership.organization.track} />}
            {appTab === 'settings' && <SettingsView orgId={orgId} org={membership.organization} role={membership.role} isAdmin={isAdmin} />}
            {appTab === 'student' && studentId && (
              <StudentScoreCardView orgId={orgId} personId={studentId} track={membership.organization.track}
                canWrite={canWrite} onBack={() => setAppTab('people')} />
            )}
            {appTab === 'admin' && isAdmin && <AdminView orgId={orgId} org={membership.organization} role={membership.role} />}
            {appTab === 'platform' && isPlatformOwner && <PlatformView />}
          </>
        )}
      </main>

      <Footer year={year} />
    </div>
  );
}
