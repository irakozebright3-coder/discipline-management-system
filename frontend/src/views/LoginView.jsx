import { useEffect, useState } from 'react';
import { signInWithPassword, signUpWithPassword } from '../lib/auth.js';
import SlidingTitle from '../components/SlidingTitle.jsx';
import WordCluster from '../components/WordCluster.jsx';
import LiquidButton from '../components/LiquidButton.jsx';

export default function LoginView() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const year = new Date(now).getFullYear();

  // Auto-rollover copyright year.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 600000);
    return () => clearInterval(timer);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (mode === 'signin') await signInWithPassword(email, password);
      else await signUpWithPassword(email, password, fullName);
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally { setBusy(false); }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <WordCluster />
        <div className="login-hero-inner">
          <SlidingTitle words={['Discipline.', 'Clarity.', 'Accountability.']} />
          <p className="hero-sub">Track conduct, incidents and marks for your school or organization — with a full audit trail on every action.</p>
          <ul className="hero-points">
            <li>Role-based access for teachers, staff and admins</li>
            <li>Incident workflow with status tracking and evidence</li>
            <li>Violations catalog with default mark deductions</li>
          </ul>
        </div>
      </section>

      <section className="login-panel">
        <form className="card login-card" onSubmit={submit}>
          <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted">Sign in to your organization's workspace</p>
          {mode === 'signup' && (
            <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" required autoComplete="name" />
          )}
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoComplete="email" />
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" minLength="6" required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          {error && <p className="error" role="alert">{error}</p>}
          <LiquidButton type="submit" disabled={busy}>{busy ? 'Please wait…' : (mode === 'signin' ? 'Sign in' : 'Create account')}</LiquidButton>
          <button type="button" className="link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
            {mode === 'signin' ? 'No account yet? Sign up' : 'Already registered? Sign in'}
          </button>
        </form>
        <footer className="login-footer muted">© {year} SDMS — Discipline Management System</footer>
      </section>
    </div>
  );
}
