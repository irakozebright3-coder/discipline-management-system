import { useEffect, useState } from 'react';
import { getCommunityStats, getCreatorProfile } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import WordCluster from '../components/WordCluster.jsx';
import SlidingTitle from '../components/SlidingTitle.jsx';
import LiquidButton from '../components/LiquidButton.jsx';

export default function PublicHomeView({ onGoLogin }) {
  const [stats, setStats] = useState(null);
  const [creator, setCreator] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([getCommunityStats(), getCreatorProfile().catch(() => ({ data: null }))]);
        setStats(s.data); setCreator(c.data);
      } catch (e) { setError(e.message); }
    })();
  }, []);

  return (
    <section className="view landing">
      <div className="hero">
        <SlidingTitle words={['Discipline', 'Management', 'System']} />
        <WordCluster />
        <p className="muted lead">A complete platform for tracking conduct, violations, and discipline marks — built for high schools, universities, companies, organizations, and communities.</p>
        <div className="cta-row">
          <LiquidButton onClick={onGoLogin}>Sign in</LiquidButton>
          <span className="muted">or create an account to set up your organization.</span>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="tracks">
        {Object.entries(TRACK_LABELS).map(([key, label]) => (
          <div key={key} className="card track-card">
            <h3>{label}</h3>
            <p className="muted">Track-adapted people, structure, violations, and reports.</p>
          </div>
        ))}
      </div>

      {stats && (
        <div className="stats-row">
          <div className="card stat"><span className="muted">Organizations</span><strong>{stats.organizations}</strong></div>
          <div className="card stat"><span className="muted">People managed</span><strong>{stats.people}</strong></div>
          <div className="card stat"><span className="muted">Incidents recorded</span><strong>{stats.incidents}</strong></div>
          <div className="card stat"><span className="muted">Visits</span><strong>{stats.visitors}</strong></div>
        </div>
      )}

      {creator && (
        <div className="card creator-card">
          <h3>{creator.full_name}</h3>
          <p className="muted">{creator.title}</p>
          <p>{creator.biography}</p>
        </div>
      )}
    </section>
  );
}
