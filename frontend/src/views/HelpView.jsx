import { useEffect, useState } from 'react';
import { getHelpArticles } from '../lib/api.js';

export default function HelpView() {
  const [articles, setArticles] = useState(null);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getHelpArticles().then(({ data }) => setArticles(data || []))
      .catch(e => setError(e.message));
  }, []);

  const categories = [...new Set((articles || []).map(a => a.category))];
  const filtered = (articles || []).filter(a => !category || a.category === category);

  return (
    <section className="view">
      <h2 className="page-title">Help Center</h2>
      {error && <p className="error" role="alert">{error}</p>}
      {articles ? (
        <>
          <div className="filter-row">
            <button className={`tab${category === '' ? ' active' : ''}`} onClick={() => setCategory('')}>All</button>
            {categories.map(c => (
              <button key={c} className={`tab${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <p className="muted">No help articles yet. Check back soon.</p>
          ) : (
            filtered.map(a => (
              <div key={a.id} className="card">
                <h3>{a.title}</h3>
                <p className="muted">{a.category}</p>
                <p style={{ whiteSpace: 'pre-line' }}>{a.content}</p>
              </div>
            ))
          )}
        </>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </section>
  );
}
