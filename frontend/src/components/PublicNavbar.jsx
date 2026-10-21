import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import SdmsLogo from './SdmsLogo.jsx';
import { Button } from './ui/button.jsx';
import { useAuth } from '../lib/AuthContext.jsx';

const links = [
  { to: '/', label: 'Home' },
  { to: '/tracks/high-school', label: 'Tracks' },
  { to: '/about', label: 'About' },
  { to: '/community', label: 'Community' },
  { to: '/help', label: 'Help Center' }
];

function PublicLinks({ mobile = false, onNavigate }) {
  return links.map((link) => (
    <NavLink
      key={link.to}
      to={link.to}
      end={link.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        `dm-nav-link ${isActive ? 'active' : ''} ${mobile ? 'dm-mobile-nav-link' : ''}`
      }
    >
      {link.label}
    </NavLink>
  ));
}

export default function PublicNavbar() {
  const { session } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="dm-public-navbar sticky top-0 z-40 border-b">
      <div className="dm-nav-inner mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="dm-nav-brand" aria-label="Discipline Management home" onClick={closeMobile}>
          <SdmsLogo />
        </Link>

        <nav className="dm-desktop-nav hidden items-center gap-6 md:flex" aria-label="Main navigation">
          <PublicLinks />
        </nav>

        <div className="dm-nav-actions flex items-center gap-2">
          {session ? (
            <Link to="/dashboard" onClick={closeMobile}>
              <Button size="sm" className="dm-nav-cta">Open app</Button>
            </Link>
          ) : (
            <>
              <Link to="/login" onClick={closeMobile}>
                <Button variant="ghost" size="sm" className="dm-nav-ghost">Sign in</Button>
              </Link>
              <Link to="/register" onClick={closeMobile}>
                <Button size="sm" className="dm-nav-cta">Get started</Button>
              </Link>
            </>
          )}
          <button
            type="button"
            className="dm-mobile-toggle"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="dm-mobile-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="dm-mobile-navigation" className="dm-mobile-menu" aria-label="Mobile navigation">
          <PublicLinks mobile onNavigate={closeMobile} />
          {session ? (
            <Link to="/dashboard" className="dm-mobile-primary" onClick={closeMobile}>Open app</Link>
          ) : (
            <Link to="/register" className="dm-mobile-primary" onClick={closeMobile}>Create your workspace</Link>
          )}
        </nav>
      )}
    </header>
  );
}
