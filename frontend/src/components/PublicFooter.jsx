import { Link } from 'react-router-dom';
import SdmsLogo from './SdmsLogo.jsx';

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="dm-public-footer border-t">
      <div className="dm-footer-inner mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 py-8 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <Link to="/" aria-label="Discipline Management home">
            <SdmsLogo className="dm-footer-brand" />
          </Link>
          <p className="text-xs">Owner &amp; developer: IRAKOZE Bright</p>
        </div>

        <nav className="dm-footer-links" aria-label="Footer navigation">
          <Link to="/about">About</Link>
          <Link to="/community">Community</Link>
          <Link to="/help">Help Center</Link>
          <Link to="/faqs">FAQs</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login">Sign in</Link>
        </nav>

        <div className="text-xs leading-6 md:text-right">
          <p>© {year} Discipline Management. All rights reserved.</p>
          <p>Designed for clear, accountable recordkeeping.</p>
        </div>
      </div>
    </footer>
  );
}
