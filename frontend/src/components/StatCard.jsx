import { Card, CardContent } from './ui/card.jsx';

export default function StatCard({ label, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        {Icon && <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>}
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
