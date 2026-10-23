import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import { useOrg } from '../hooks/useOrg.jsx';

export default function Layout() {
  const { orgs, orgsLoaded } = useOrg();

  if (!orgsLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-muted-foreground" role="status">
        Loading your workspace…
      </div>
    );
  }

  if (orgs.length === 0) return <Navigate to="/setup" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
    <div aria-hidden="true" className="dm-brand-strip" />

      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
