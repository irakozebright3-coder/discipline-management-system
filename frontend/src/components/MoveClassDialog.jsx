import { useEffect, useState } from 'react';
import { listStructureNodes, updatePerson } from '../lib/api.js';
import LiquidButton from './LiquidButton.jsx';

export default function MoveClassDialog({ orgId, person, onMoved, onCancel }) {
  const [classes, setClasses] = useState([]);
  const [target, setTarget] = useState(person?.class_id || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await listStructureNodes(orgId);
        if (!cancelled) setClasses((data || []).filter(n => n.node_type === 'class'));
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  async function move() {
    setError(''); setBusy(true);
    try {
      await updatePerson(person.id, { class_id: target || null }, orgId);
      onMoved(target);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="overlay" role="dialog" aria-label="Move student to another class">
      <div className="card dialog">
        <h3>Move {person.full_name}</h3>
        <p className="muted">Current class: {person.class_id || 'None'}</p>
        <select className="input" value={target} onChange={e => setTarget(e.target.value)} aria-label="New class">
          <option value="">No class</option>
          {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="form-actions">
          <LiquidButton disabled={busy} onClick={move}>{busy ? 'Moving…' : 'Move student'}</LiquidButton>
          <button type="button" className="link" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
