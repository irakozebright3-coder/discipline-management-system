import { cn } from '../../lib/utils.js';
export const Tabs = ({ tabs, active, onChange, className }) => (
  <div className={cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)} role="tablist">
    {tabs.map(t => (
      <button key={t} role="tab" aria-selected={active === t}
        onClick={() => onChange(t)}
        className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active === t ? 'bg-background text-foreground shadow' : 'hover:text-foreground')}>
        {t}
      </button>
    ))}
  </div>
);
