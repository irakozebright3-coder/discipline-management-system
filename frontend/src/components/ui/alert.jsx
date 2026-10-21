import { cn } from '../../lib/utils.js';
const variants = { default: 'bg-background text-foreground', destructive: 'border-destructive/50 text-destructive' };
export const Alert = ({ className, variant = 'default', ...props }) => (
  <div role="alert" className={cn('relative w-full rounded-lg border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px]', variants[variant], className)} {...props} />
);
