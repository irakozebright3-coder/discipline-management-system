import { cn } from '../../lib/utils.js';
export const Dialog = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={cn('relative z-10 w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg')}>{children}</div>
    </div>
  );
};
