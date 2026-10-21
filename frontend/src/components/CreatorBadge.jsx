import { Sparkles } from 'lucide-react';

export default function CreatorBadge({ name, title }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm">
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="font-medium">{name}</span>
      {title && <span className="text-muted-foreground">· {title}</span>}
    </div>
  );
}
