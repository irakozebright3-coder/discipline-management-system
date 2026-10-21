import { useEffect, useState } from 'react';
import { getCreatorProfile } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';

export default function AboutView() {
  const [creator, setCreator] = useState(null);
  useEffect(() => {
    getCreatorProfile().then(({ data }) => setCreator(data)).catch(() => setCreator(null));
  }, []);

  return (
    <section className="view">
      <h2 className="page-title">About</h2>
      <div className="card">
        <h3>Our mission</h3>
        <p>Every institution deserves transparent, fair discipline management. SDMS records conduct
        incidents, deducts marks consistently, and keeps a full audit trail — so decisions about
        students, employees, and members are based on facts, not memory.</p>
      </div>
      {creator && (
        <div className="card">
          <h3>{creator.full_name}</h3>
          <p className="muted">{creator.title}</p>
          <p>{creator.biography}</p>
        </div>
      )}
      <div className="card">
        <h3>Supported tracks</h3>
        <ul className="track-list">
          {Object.values(TRACK_LABELS).map(label => <li key={label}>{label}</li>)}
        </ul>
      </div>
    </section>
  );
}
