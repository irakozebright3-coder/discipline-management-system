import { cn } from '../lib/utils.js';

export default function SdmsLogo({ className, light = false }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-lg font-bold tracking-tight', light ? 'text-white' : 'text-foreground', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground shadow">SD</span>
      <span>SDMS</span>
    </span>
  );
}
