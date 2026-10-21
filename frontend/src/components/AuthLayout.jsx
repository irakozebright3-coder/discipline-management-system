import { Link, Outlet } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import SdmsLogo from './SdmsLogo.jsx';

export default function AuthLayout() {
  return (
    <div className="dm-auth-layout flex min-h-screen bg-background">
      <section className="dm-auth-visual hidden flex-1 flex-col justify-between p-10 lg:flex">
        <Link to="/" aria-label="Discipline Management home"><SdmsLogo light /></Link>
        <div className="dm-auth-visual-copy">
          <span className="dm-auth-eyebrow"><ShieldCheck size={14} /> A clearer way to work</span>
          <h1>Discipline.<br /><span>Clarity.</span><br />Accountability.</h1>
          <p>Keep people, incidents, decisions and follow-ups connected in one carefully structured workspace.</p>
          <div className="dm-auth-benefit-list">
            <span><CheckCircle2 size={16} /> Track-specific workflows</span>
            <span><CheckCircle2 size={16} /> Searchable history and reporting</span>
            <span><CheckCircle2 size={16} /> Access based on your role</span>
          </div>
        </div>
        <div className="dm-auth-bottom">
          <span>DISCIPLINE MANAGEMENT</span>
          <span>Built by IRAKOZE Bright <ArrowRight size={14} /></span>
        </div>
        <div className="dm-auth-visual-orb" aria-hidden="true" />
      </section>

      <main className="dm-auth-main">
        <div className="dm-auth-form-wrap">
          <div className="dm-auth-mobile-brand lg:hidden"><Link to="/"><SdmsLogo /></Link></div>
          <Outlet />
          <p className="dm-auth-footnote">Your workspace is protected by account and organization permissions.</p>
        </div>
      </main>
    </div>
  );
}
