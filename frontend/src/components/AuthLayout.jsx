import { Outlet } from 'react-router-dom';
import SdmsLogo from './SdmsLogo.jsx';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <SdmsLogo light />
        <div>
          <h1 className="text-4xl font-bold leading-tight">Discipline. Clarity. Accountability.</h1>
          <p className="mt-4 max-w-md opacity-90">Track conduct, incidents and marks for your school or organization — with a full audit trail on every action.</p>
        </div>
        <p className="text-sm opacity-70">Role-based access · Incident workflow · Violations catalog</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <Outlet />
      </div>
    </div>
  );
}
