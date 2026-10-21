import { useEffect, useState } from 'react';
import { Dialog } from './ui/dialog.jsx';
import { Button } from './ui/button.jsx';
import { Select } from './ui/select.jsx';
import { listStructureNodes, updatePerson } from '../lib/api.js';

export default function MoveClassDialog({ orgId, person, onMoved, onClose }) {
  const [classes, setClasses] = useState([]);
  const [target, setTarget] = useState(person?.class_id || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listStructureNodes(orgId)
      .then(({ data }) => setClasses((data || []).filter(n => n.node_type === 'class')))
      .catch(e => setError(e.message));
  }, [orgId]);

  const move = async () => {
    setError(''); setBusy(true);
    try {
      await updatePerson(person.id, { class_id: target || null }, orgId);
      onMoved(target);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose}>
      <h3 className="text-lg font-semibold">Move {person.full_name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Current class: {person.class_id || 'None'}</p>
      <div className="mt-4 space-y-3">
        <Select value={target} onChange={e => setTarget(e.target.value)} aria-label="New class">
          <option value="">No class</option>
          {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </Select>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={move} disabled={busy}>{busy ? 'Moving…' : 'Move student'}</Button>
        </div>
      </div>
    </Dialog>
  );
}
