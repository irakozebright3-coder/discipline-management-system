import { useEffect, useState } from 'react';
import { getContributors, getCreatorProfile, getCommunityStats } from '../lib/api.js';

export default function CommunityView() {
  const [contributors, setContributors] = useState(null);
  const [creator, setCreator] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [c, k, s] = await Promise.all([getContributors(), getCreatorProfile(), getCommunityStats()]);
        setContributors(c.data); setCreator(k.data); setStats(s.data);
      } catch (e) { setError(e.message); }
    })();
  }, []);

  return (
    <section className="view">
      <h2 className="page-title">Community</h2>
      {error && <p className="error" role="alert">{error}</p>}

      {creator && (
        <div className="card">
          <h3>{creator.full_name}</h3>
          <p className="muted">{creator.title}</p>
          <p>{creator.biography}</p>
        </div>
      )}

      {contributors && (
        <>
          <h3>Contributors</h3>
          {contributors.length === 0 ? (
            <p className="muted">No contributors listed yet.</p>
          ) : (
            <div className="tracks">
              {contributors.map(c => (
                <div key={c.id} className="card">
                  <h4>{c.name}</h4>
                  <p className="muted">{c.role}</p>
                  <p>{c.contribution || c.biography}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {stats && (
        <div className="stats-row">
          <div className="card stat"><span className="muted">Community organizations</span><strong>{stats.organizations}</strong></div>
          <div className="card stat"><span className="muted">Contributors</span><strong>{stats.contributors}</strong></div>
          <div className="card stat"><span className="muted">Visits</span><strong>{stats.visitors}</strong></div>
        </div>
      )}
    </section>
  );
}
