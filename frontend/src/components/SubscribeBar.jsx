import { useState } from 'react';
import { BellRing, Check, Loader2 } from 'lucide-react';
import { subscribeForUpdates } from '../lib/api.js';

// Email or phone sign-up for founder updates. `variant` only changes layout/padding.
export default function SubscribeBar({ variant = 'banner' }) {
  const [value, setValue] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, hidden from people
  const [state, setState] = useState('idle'); // idle | busy | done
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (state === 'busy') return;
    setError('');
    if (!value.trim()) return setError('Enter your email or phone number.');
    setState('busy');
    try {
      await subscribeForUpdates(value.trim(), website);
      setState('done');
    } catch (err) {
      setError(err.message || 'Could not subscribe. Please try again.');
      setState('idle');
    }
  };

  return (
    <section className={`dm-subscribe dm-subscribe-${variant}`} aria-labelledby={`dm-sub-title-${variant}`}>
      <div className="dm-subscribe-copy">
        <span className="dm-subscribe-icon" aria-hidden="true"><BellRing size={18} /></span>
        <div>
          <h2 id={`dm-sub-title-${variant}`}>Get updates from the founder</h2>
          <p>New features and announcements, straight to your email or phone. No spam.</p>
        </div>
      </div>
      {state === 'done' ? (
        <p className="dm-subscribe-done" role="status"><Check size={16} /> You&apos;re subscribed. Thank you!</p>
      ) : (
        <form onSubmit={submit} className="dm-subscribe-form" noValidate>
          <label htmlFor={`dm-sub-input-${variant}`} className="dm-sr-only">Email or phone number</label>
          <input
            id={`dm-sub-input-${variant}`}
            type="text" inputMode="email" autoComplete="email"
            value={value} onChange={e => setValue(e.target.value)}
            placeholder="Email or phone (+250…)"
            aria-invalid={!!error} aria-describedby={error ? `dm-sub-err-${variant}` : undefined}
          />
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={e => setWebsite(e.target.value)} className="dm-subscribe-hp" name="website" />
          <button type="submit" disabled={state === 'busy'}>{state === 'busy' ? <><Loader2 size={15} className="dm-spin" /> Saving…</> : 'Subscribe'}</button>
          {error && <p id={`dm-sub-err-${variant}`} className="dm-subscribe-error" role="alert">{error}</p>}
        </form>
      )}
    </section>
  );
}
