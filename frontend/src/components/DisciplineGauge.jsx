// Discipline level display: a ring showing the percentage plus the level label.
// Colors are fixed (not theme tokens) so a level always reads the same way.
const TONES = {
  good: { stroke: '#34d399', text: 'text-emerald-400', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ok: { stroke: '#a3e635', text: 'text-lime-400', chip: 'bg-lime-500/15 text-lime-300 border-lime-500/30' },
  warn: { stroke: '#fbbf24', text: 'text-amber-400', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  bad: { stroke: '#f87171', text: 'text-red-400', chip: 'bg-red-500/15 text-red-300 border-red-500/30' },
  muted: { stroke: '#6b7280', text: 'text-muted-foreground', chip: 'bg-muted text-muted-foreground border-border' }
};

export const toneOf = (level) => TONES[level?.tone] || TONES.muted;

export function LevelChip({ level, className = '' }) {
  const t = toneOf(level);
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${t.chip} ${className}`}>{level?.label || 'No data'}</span>;
}

export function PercentBar({ value, level }) {
  const t = toneOf(level);
  const pct = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted" role="presentation">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.stroke }} />
      </div>
      <span className="w-12 text-right text-sm tabular-nums">{typeof value === 'number' ? `${value}%` : '—'}</span>
    </div>
  );
}

export default function DisciplineGauge({ percentage, level, size = 132, label = 'Discipline level' }) {
  const t = toneOf(level);
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const pct = typeof percentage === 'number' ? Math.max(0, Math.min(100, percentage)) : 0;
  return (
    <div className="flex items-center gap-4" role="img" aria-label={`${label}: ${typeof percentage === 'number' ? percentage + ' percent' : 'no data'}, ${level?.label || 'No data'}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.stroke} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
        <g transform={`rotate(90 ${size / 2} ${size / 2})`}>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className={`fill-current ${t.text}`} style={{ fontSize: size * 0.24, fontWeight: 700 }}>
            {typeof percentage === 'number' ? `${Math.round(percentage)}%` : '—'}
          </text>
        </g>
      </svg>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${t.text}`}>{level?.label || 'No data'}</p>
      </div>
    </div>
  );
}
