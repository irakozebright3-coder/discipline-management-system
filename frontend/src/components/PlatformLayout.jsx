import { Outlet } from 'react-router-dom';
import PlatformSidebar from './PlatformSidebar.jsx';

export default function PlatformLayout() {
  return (
    <div className="flex min-h-screen">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6"><Outlet /></div>
      </main>
    </div>
  );
}
