import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

// Debounced search input used across all panels.
// value/onChange receive the DEBOUNCED query; `instant` keeps every keystroke.
export default function SearchBar({ value, onChange, instant = false, placeholder = 'Search…', className = 'max-w-xs', ariaLabel = 'Search' }) {
  const [text, setText] = useState(value || '');
  const timer = useRef(null);
  useEffect(() => { setText(value || ''); }, [value]);
  const handleChange = (e) => {
    const v = e.target.value;
    setText(v);
    clearTimeout(timer.current);
    if (instant) onChange(v);
    else timer.current = setTimeout(() => onChange(v), 300);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm outline-none ring-ring focus-visible:ring-2"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setText(''); onChange(''); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
