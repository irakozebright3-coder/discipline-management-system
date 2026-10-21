import { useEffect, useState } from 'react';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import { listStructureNodes, createStructureNode, deleteStructureNode } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Badge } from '../components/ui/badge.jsx';

const NODE_TYPES = {
  HIGH_SCHOOL: [['class', 'Classes'], ['trade', 'Trades'], ['role', 'Roles']],
  UNIVERSITY: [['faculty', 'Faculties'], ['academic_department', 'Academic departments'], ['program', 'Programs'], ['year_of_study', 'Years of study'], ['cohort', 'Cohorts']],
  COMPANY: [['department', 'Departments'], ['office', 'Offices'], ['role', 'Roles']],
  ORGANIZATION: [['department', 'Departments'], ['office', 'Offices'], ['role', 'Roles']],
  COMMUNITY: [['role', 'Roles'], ['cohort', 'Cohorts']]
};

export default function Structure() {
  const { orgId, organization } = useOrg();
  const { isAdmin, canWrite } = useRole();
  const track = organization?.track || 'HIGH_SCHOOL';
  const types = NODE_TYPES[track] || NODE_TYPES.ORGANIZATION;
  const [nodes, setNodes] = useState(null);
  const [activeType, setActiveType] = useState(types[0][0]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => setNodes((await listStructureNodes(orgId)).data);

  useEffect(() => {
    if (!orgId) return;
    reload().catch(e => setError(e.message));
    if (!types.some(([k]) => k === activeType)) setActiveType(types[0][0]);
  }, [orgId, track]);

  const visible = (nodes || []).filter(n => n.node_type === activeType);
  const currentLabel = types.find(t => t[0] === activeType)?.[1] || 'Nodes';

  const add = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true); setError('');
    try {
      await createStructureNode({ organization_id: orgId, node_type: activeType, name: newName.trim() });
      setNewName(''); setAdding(false);
      await reload();
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  };

  const remove = async (node) => {
    if (!window.confirm(`Delete "${node.name}"?`)) return;
    setError('');
    try { await deleteStructureNode(node.id, orgId); await reload(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Structure</h1>
          <p className="text-sm text-muted-foreground">{TRACK_LABELS[track]} structure — used by people, incidents, and reports.</p>
        </div>
        {canWrite && <Button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : `+ Add ${currentLabel.slice(0, -1).toLowerCase()}`}</Button>}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {types.map(([key, label]) => (
          <button key={key} onClick={() => setActiveType(key)}
            className={`rounded-full border px-4 py-1.5 text-sm ${activeType === key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'}`}>
            {label}
          </button>
        ))}
      </div>

      {adding && (
        <form onSubmit={add} className="flex max-w-md gap-2">
          <div className="flex-1 space-y-1">
            <Label className="sr-only">Name</Label>
            <Input required value={newName} onChange={e => setNewName(e.target.value)} placeholder={`New ${currentLabel.slice(0, -1).toLowerCase()} name`} />
          </div>
          <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add'}</Button>
        </form>
      )}

      {!nodes ? <p className="text-muted-foreground">Loading…</p> : visible.length === 0 ? (
        <p className="text-muted-foreground">Nothing here yet. Add your first {currentLabel.toLowerCase()}.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Type</th>
              {isAdmin && <th className="p-3 font-medium"></th>}
            </tr></thead>
            <tbody>
              {visible.map(n => (
                <tr key={n.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{n.name}</td>
                  <td className="p-3"><Badge variant="outline">{n.node_type}</Badge></td>
                  {isAdmin && <td className="p-3"><button className="text-sm text-destructive hover:underline" onClick={() => remove(n)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
