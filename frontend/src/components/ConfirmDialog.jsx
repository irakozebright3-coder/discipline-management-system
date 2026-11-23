import { useEffect, useRef } from 'react';
import { Button } from './ui/button.jsx';

// Accessible confirm modal for destructive actions. Focus starts on Cancel so Enter never deletes by accident.
export default function ConfirmDialog({ title, children, confirmLabel = 'Delete', tone = 'danger', busy = false, error = '', onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const k = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCancel, busy]);
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={() => !busy && onCancel()} aria-label="Close" tabIndex={-1} />
      <div className="relative z-10 w-full max-w-md space-y-4 rounded-xl border bg-card p-5 shadow-2xl">
        <h2 id="confirm-title" className="text-lg font-bold">{title}</h2>
        <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="button" variant={tone === 'danger' ? 'destructive' : 'default'} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
