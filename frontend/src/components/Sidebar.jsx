import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileWarning, ListChecks, Network, History, BarChart3,
  Settings2, ShieldCheck, LogOut, Building2, Menu, X
} from 'lucide-react';
import SdmsLogo from './SdmsLogo.jsx';
import { cn } from '../lib/utils.js';
import { useOrg } from '../hooks/useOrg.jsx';
import { signOut } from '../lib/auth.js';
import { platformGet } from '../lib/api.js';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/people', label: 'People', icon: Users },
  { to: '/incidents', label: 'Incidents', icon: FileWarning },
  { to: '/violations', label: 'Violations', icon: ListChecks },
  { to: '/structure', label: 'Structure', icon: Network },
  { to: '/history', label: 'History', icon: History },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings2 }
];

export default function Sidebar() {
  const { organization, membership, orgs, setActiveOrg } = useOrg();
  const navigate = useNavigate();
  const [isOwner, setIsOwner] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;
    platformGet('whoami')
      .then(() => { if (active) setIsOwner(true); })
      .catch(() => { if (active) setIsOwner(false); });
    return () => { active = false; };
  }, []);

  const closeMobile = () => setMobileOpen(false);
  const doSignOut = async () => {
    try {
      await signOut();
      closeMobile();
      navigate('/');
    } catch (error) {
      // Keep the user in the current workspace if sign-out fails.
      console.error('Sign out failed', error);
    }
  };

  const renderOrganizationPicker = () => (
    <div className="border-b p-4">
      <label className="text-xs font-medium text-muted-foreground" htmlFor="active-organization">Organization</label>
      <select
        id="active-organization"
        className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
        value={organization?.id || ''}
        onChange={(event) => { setActiveOrg(event.target.value); closeMobile(); }}
        aria-label="Active organization"
      >
        {orgs.length === 0 && <option value="">No organization yet</option>}
        {orgs.map((item) => <option key={item.organization.id} value={item.organization.id}>{item.organization.name}</option>)}
      </select>
      {membership && <p className="mt-1 text-xs text-muted-foreground">Your role: {membership.role}</p>}
    </div>
  );

  const renderNavigation = () => (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Workspace navigation">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={closeMobile}
          className={({ isActive }) => cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" /> {label}
        </NavLink>
      ))}
      {isOwner && (
        <NavLink
          to="/platform"
          onClick={closeMobile}
          className={({ isActive }) => cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Building2 className="h-4 w-4 shrink-0" /> Platform console
        </NavLink>
      )}
      {membership && ['org_admin', 'platform_owner'].includes(membership.role) && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Administration</p>
          <NavLink
            to="/settings"
            onClick={closeMobile}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" /> Organization controls
          </NavLink>
        </div>
      )}
    </nav>
  );

  const renderSignOut = () => (
    <div className="border-t p-3">
      <button
        type="button"
        onClick={doSignOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );

  return (
    <>
      <div className="flex h-16 items-center justify-between gap-3 border-b bg-card px-4 md:hidden">
        <Link to="/dashboard" aria-label="Discipline Management dashboard"><SdmsLogo /></Link>
        <div className="flex min-w-0 items-center gap-3">
          <span className="max-w-[30vw] truncate text-xs text-muted-foreground">{organization?.name || 'Workspace'}</span>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-background text-foreground"
            aria-label="Open workspace navigation"
            aria-expanded={mobileOpen}
            aria-controls="dm-workspace-mobile-menu"
          ><Menu size={19} /></button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button type="button" className="absolute inset-0 h-full w-full bg-black/70" onClick={closeMobile} aria-label="Close workspace navigation" />
          <aside id="dm-workspace-mobile-menu" className="relative z-10 flex h-full w-[min(21rem,88vw)] flex-col border-r bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Link to="/dashboard" onClick={closeMobile}><SdmsLogo /></Link>
              <button type="button" onClick={closeMobile} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-foreground" aria-label="Close navigation"><X size={18} /></button>
            </div>
            {renderOrganizationPicker()}
            {renderNavigation()}
            {renderSignOut()}
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Link to="/dashboard"><SdmsLogo /></Link>
        </div>
        {renderOrganizationPicker()}
        {renderNavigation()}
        {renderSignOut()}
      </aside>
    </>
  );
}
