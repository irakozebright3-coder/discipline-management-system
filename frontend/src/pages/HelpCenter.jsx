import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { getHelpArticles } from '../lib/api.js';

export default function HelpCenter() {
  const [articles, setArticles] = useState(null);
  const [category, setCategory] = useState('');
  useEffect(() => {
    getHelpArticles().then(({ data }) => setArticles(data || [])).catch(() => setArticles([]));
  }, []);
  const categories = [...new Set((articles || []).map(a => a.category))];
  const filtered = (articles || []).filter(a => !category || a.category === category);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-bold">Help Center</h1>
      <div className="flex flex-wrap gap-2">
        <button className={`rounded-full border px-4 py-1.5 text-sm ${category === '' ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
          onClick={() => setCategory('')}>All</button>
        {categories.map(c => (
          <button key={c} className={`rounded-full border px-4 py-1.5 text-sm ${category === c ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
            onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>
      {articles === null ? <p className="text-muted-foreground">Loading…</p>
        : filtered.length === 0 ? <p className="text-muted-foreground">No help articles yet. Check back soon.</p>
        : filtered.map(a => (
          <Card key={a.id}>
            <CardHeader><CardTitle className="text-lg">{a.title}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.category}</p>
              <p className="mt-2 whitespace-pre-line text-sm">{a.content}</p>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
