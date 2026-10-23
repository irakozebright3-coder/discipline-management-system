import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, ScrollText, HeartHandshake, UserCog,
  LifeBuoy, DatabaseBackup, SlidersHorizontal, LogOut, Menu, X
} from 'lucide-react';
import SdmsLogo from './SdmsLogo.jsx';
import { cn } from '../lib/utils.js';
import { signOut } from '../lib/auth.js';

const items = [
  { to: '/platform', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/platform/organizations', label: 'Institutions', icon: Building2 },
  { to: '/platform/users', label: 'Users', icon: Users },
  { to: '/platform/audit-logs', label: 'Audit logs', icon: ScrollText },
  { to: '/platform/contributors', label: 'Contributors', icon: HeartHandshake },
  { to: '/platform/creator-profile', label: 'Creator profile', icon: UserCog },
  { to: '/platform/help-center', label: 'Help center', icon: LifeBuoy },
  { to: '/platform/system-control', label: 'System control', icon: SlidersHorizontal }
];

export default function PlatformSidebar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const doSignOut = async () => {
    try {
      await signOut();
      closeMobile();
      navigate('/');
    } catch (error) {
      console.error('Sign out failed', error);
    }
  };

  const renderNavigation = () => (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Platform navigation">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
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
        <Link to="/platform" aria-label="Discipline Management platform console"><SdmsLogo /></Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-background text-foreground"
          aria-label="Open platform navigation"
          aria-expanded={mobileOpen}
          aria-controls="dm-platform-mobile-menu"
        ><Menu size={19} /></button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button type="button" className="absolute inset-0 h-full w-full bg-black/70" onClick={closeMobile} aria-label="Close platform navigation" />
          <aside id="dm-platform-mobile-menu" className="relative z-10 flex h-full w-[min(21rem,88vw)] flex-col border-r bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Link to="/platform" onClick={closeMobile}><SdmsLogo /></Link>
              <button type="button" onClick={closeMobile} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-foreground" aria-label="Close navigation"><X size={18} /></button>
            </div>
            <div className="border-b p-4"><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">Platform owner console</p></div>
            {renderNavigation()}
            {renderSignOut()}
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Link to="/platform"><SdmsLogo /></Link>
        </div>
        <div className="border-b p-4"><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">Platform owner console</p></div>
        {renderNavigation()}
        {renderSignOut()}
      </aside>
    </>
  );
}
