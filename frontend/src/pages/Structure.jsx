import { useEffect, useState } from 'react';
import { useOrg, useRole } from '../hooks/useOrg.jsx';
import { listStructureNodes, createStructureNode, deleteStructureNode } from '../lib/api.js';
import SearchBar from '../components/SearchBar.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Select } from '../components/ui/select.jsx';
import { Badge } from '../components/ui/badge.jsx';

const UNIT_TYPES = {
  HIGH_SCHOOL: [['class', 'Classes'], ['stream', 'Streams'], ['trade', 'Trades'], ['subject', 'Subjects'], ['academic_year', 'Academic years'], ['term', 'Terms']],
  UNIVERSITY: [['department', 'Departments'], ['program', 'Programs'], ['cohort', 'Cohorts'], ['office', 'Offices']],
  COMPANY: [['department', 'Departments'], ['branch', 'Branches'], ['office', 'Offices'], ['position', 'Positions']],
  ORGANIZATION: [['department', 'Departments'], ['branch', 'Branches'], ['office', 'Offices'], ['position', 'Positions']],
  COMMUNITY: [['cohort', 'Cohorts'], ['position', 'Positions']]
};

export default function Structure() {
  const { orgId, organization } = useOrg();
  const { isAdmin, canWrite } = useRole();
  const track = organization?.track || 'HIGH_SCHOOL';
  const types = UNIT_TYPES[track] || UNIT_TYPES.ORGANIZATION;
  const [nodes, setNodes] = useState(null);
  const [activeType, setActiveType] = useState(types[0][0]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    listStructureNodes(orgId).then(({ data }) => setNodes(data)).catch(e => setError(e.message));
    if (!types.some(([k]) => k === activeType)) setActiveType(types[0][0]);
  }, [orgId, track]);

  const reload = async () => setNodes((await listStructureNodes(orgId)).data);
  const needle = search.trim().toLowerCase();
  const visible = (nodes || []).filter(n => n.unit_type === activeType &&
    (!needle || n.name.toLowerCase().includes(needle)));
  const currentLabel = types.find(t => t[0] === activeType)?.[1] || 'Entries';

  const add = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true); setError('');
    try {
      await createStructureNode({ institution_id: orgId, unit_type: activeType, name: newName.trim() });
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
        <h1 className="text-2xl font-bold">Structure</h1>
        {canWrite && <Button onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add entry'}</Button>}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {adding && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
          <div className="space-y-1.5"><Label>Type</Label>
            <Select value={activeType} onChange={e => setActiveType(e.target.value)}>
              {types.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select></div>
          <div className="space-y-1.5"><Label>Name</Label>
            <Input required value={newName} onChange={e => setNewName(e.target.value)} placeholder={`New ${currentLabel.toLowerCase()} name`} /></div>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add'}</Button>
        </form>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {types.map(([k, l]) => (
          <button key={k} onClick={() => setActiveType(k)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${activeType === k ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
            {l}
          </button>
        ))}
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder={`Search ${currentLabel.toLowerCase()}…`} ariaLabel={`Search ${currentLabel}`} className="max-w-sm" />
      {!nodes ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Created</th>{isAdmin && <th className="p-3 font-medium"></th>}
            </tr></thead>
            <tbody>
              {visible.map(n => (
                <tr key={n.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{n.name}</td>
                  <td className="p-3"><Badge variant="outline">{n.unit_type}</Badge></td>
                  <td className="p-3 text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</td>
                  {isAdmin && <td className="p-3"><button className="text-sm text-destructive hover:underline" onClick={() => remove(n)}>Delete</button></td>}
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-muted-foreground">No entries found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
