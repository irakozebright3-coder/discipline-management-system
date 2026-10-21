import { Link, NavLink } from 'react-router-dom';
import SdmsLogo from './SdmsLogo.jsx';
import { Button } from './ui/button.jsx';
import { useAuth } from '../lib/AuthContext.jsx';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/community', label: 'Community' },
  { to: '/help', label: 'Help Center' }
];

export default function PublicNavbar() {
  const { session } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/"><SdmsLogo /></Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) =>
              `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {session ? (
            <Link to="/dashboard"><Button size="sm">Open app</Button></Link>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/register"><Button size="sm">Sign up</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
