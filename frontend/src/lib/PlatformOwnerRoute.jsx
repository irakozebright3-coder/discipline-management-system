import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { platformGet } from './api.js';
import { PlatformOwnerContext } from './PlatformOwner.jsx';

export default function PlatformOwnerRoute({ children }) {
  const { session, loading } = useAuth();
  const [state, setState] = useState('checking');

  useEffect(() => {
    if (loading) return;
    if (!session) { setState('denied'); return; }
    platformGet('whoami')
      .then(() => setState('owner'))
      .catch(() => setState('denied'));
  }, [session?.user?.id, loading]);

  if (loading || state === 'checking')
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Checking access…</div>;
  if (state === 'denied') return <Navigate to="/dashboard" replace />;
  return <PlatformOwnerContext.Provider value={true}>{children}</PlatformOwnerContext.Provider>;
}
