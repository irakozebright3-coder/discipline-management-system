import SdmsLogo from './SdmsLogo.jsx';

export default function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <SdmsLogo />
        <p>© {year} SDMS — Discipline Management System. All rights reserved.</p>
        <p>Every action is recorded in the audit trail.</p>
      </div>
    </footer>
  );
}
