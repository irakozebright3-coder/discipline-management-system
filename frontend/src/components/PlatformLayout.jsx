import { Outlet } from 'react-router-dom';
import PlatformSidebar from './PlatformSidebar.jsx';

export default function PlatformLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <PlatformSidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
