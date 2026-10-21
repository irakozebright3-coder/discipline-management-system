import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import { useOrg } from '../hooks/useOrg.jsx';

export default function Layout() {
  const { orgs, orgsLoaded } = useOrg();
  // Wait until organizations are loaded, otherwise users with a team get bounced to /setup.
  if (!orgsLoaded) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  // No organization yet: the app is unusable until setup completes.
  if (orgs.length === 0) return <Navigate to="/setup" replace />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
