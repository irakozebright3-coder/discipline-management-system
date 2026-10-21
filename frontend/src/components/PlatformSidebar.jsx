import { NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, ScrollText, HeartHandshake, UserCog, LifeBuoy, DatabaseBackup, SlidersHorizontal, LogOut } from 'lucide-react';
import SdmsLogo from './SdmsLogo.jsx';
import { cn } from '../lib/utils.js';
import { signOut } from '../lib/auth.js';

const items = [
  { to: '/platform', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/platform/organizations', label: 'Organizations', icon: Building2 },
  { to: '/platform/users', label: 'Users', icon: Users },
  { to: '/platform/audit-logs', label: 'Audit logs', icon: ScrollText },
  { to: '/platform/contributors', label: 'Contributors', icon: HeartHandshake },
  { to: '/platform/creator-profile', label: 'Creator profile', icon: UserCog },
  { to: '/platform/help-center', label: 'Help center', icon: LifeBuoy },
  { to: '/platform/backups', label: 'Backups', icon: DatabaseBackup },
  { to: '/platform/system-control', label: 'System control', icon: SlidersHorizontal }
];

export default function PlatformSidebar() {
  const navigate = useNavigate();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center border-b px-5">
        <Link to="/dashboard"><SdmsLogo /></Link>
      </div>
      <div className="border-b p-3"><p className="px-2 text-xs font-medium text-muted-foreground">Platform owner console</p></div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) =>
            cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}>
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <button onClick={async () => { await signOut(); navigate('/'); }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
