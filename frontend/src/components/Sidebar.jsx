import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileWarning, ListChecks, Network, History, BarChart3, Settings2, ShieldCheck, LogOut, Building2 } from 'lucide-react';
import SdmsLogo from './SdmsLogo.jsx';
import { cn } from '../lib/utils.js';
import { useOrg, ROLE_WEIGHT } from '../hooks/useOrg.jsx';
import { signOut } from '../lib/auth.js';
import { platformGet } from '../lib/api.js';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    platformGet('whoami').then(() => setIsOwner(true)).catch(() => setIsOwner(false));
  }, []);

  const adminItems = [{ to: '/admin', label: 'Admin', icon: ShieldCheck }];
  const ownerItems = [{ to: '/platform', label: 'Platform console', icon: Building2 }];

  const doSignOut = async () => { await signOut(); navigate('/'); };

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center border-b px-5">
        <Link to="/"><SdmsLogo /></Link>
      </div>
      <div className="border-b p-4">
        <label className="text-xs font-medium text-muted-foreground">Organization</label>
        <select className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          value={organization?.id || ''} onChange={e => setActiveOrg(e.target.value)} aria-label="Active organization">
          {orgs.length === 0 && <option value="">No organization yet</option>}
          {orgs.map(m => <option key={m.organization.id} value={m.organization.id}>{m.organization.name}</option>)}
        </select>
        {membership && <p className="mt-1 text-xs text-muted-foreground">Your role: {membership.role}</p>}
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}>
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
        {membership && ROLE_WEIGHT[membership.role] >= 2 && adminItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}>
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
        {isOwner && ownerItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}>
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <button onClick={doSignOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
