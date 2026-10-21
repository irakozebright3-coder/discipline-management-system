import { WELCOME_MEMBERS } from '../lib/memberGallery.js';

// Responsive mosaic of member portraits with name/role on hover.
// Pass `members` to override, or `track` to show a single track's people.
export default function MemberGallery({ members, track, limit, showRoles = true, className = '' }) {
  const list = (members || (track ? WELCOME_MEMBERS.filter(m => m.track === track) : WELCOME_MEMBERS)).slice(0, limit);
  if (!list.length) return null;
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 ${className}`}>
      {list.map(m => (
        <figure key={m.id} className="group relative overflow-hidden rounded-lg border bg-card">
          <img
            src={m.photo}
            alt={`${m.name} — ${m.role}`}
            loading="lazy"
            className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
            <p className="text-sm font-medium text-white">{m.name}</p>
            {showRoles && <p className="text-xs text-white/75">{m.role}</p>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
