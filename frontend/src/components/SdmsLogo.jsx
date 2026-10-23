import { cn } from '../lib/utils.js';

// The Discipline Management mark: a caramel-brown shield with a balance
// scale, yellow rim, and blue base — the same artwork as the site favicon.
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-8 w-8 shrink-0', className)} role="img" aria-label="Discipline Management logo">
      <defs>
        <linearGradient id="dm-logo-brown" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C08A57" />
          <stop offset="1" stopColor="#7A4A26" />
        </linearGradient>
      </defs>
      <path d="M32 3l24 8v19c0 15.4-10.1 26.4-24 31C18.1 56.4 8 45.4 8 30V11z" fill="url(#dm-logo-brown)" />
      <path d="M32 3l24 8v19c0 15.4-10.1 26.4-24 31C18.1 56.4 8 45.4 8 30V11z" fill="none" stroke="#F5C542" strokeWidth="2.6" strokeLinejoin="round" />
      <line x1="17.5" y1="21.5" x2="46.5" y2="21.5" stroke="#FAF5EE" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="32" y1="21.5" x2="32" y2="40.5" stroke="#FAF5EE" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="21.5" r="3" fill="#F5C542" />
      <path d="M17.5 21.5l-4.8 8.4h9.6z" fill="#FAF5EE" />
      <path d="M46.5 21.5l-4.8 8.4h9.6z" fill="#FAF5EE" />
      <line x1="25" y1="44" x2="39" y2="44" stroke="#3B82F6" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export default function SdmsLogo({ className, light = false }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-lg font-bold tracking-tight', light ? 'text-white' : 'text-foreground', className)}>
      <LogoMark />
      <span>Discipline Management</span>
    </span>
  );
}
