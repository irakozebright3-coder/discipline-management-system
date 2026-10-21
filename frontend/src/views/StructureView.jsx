import { useEffect, useState } from 'react';
import { listStructureNodes, createStructureNode, deleteStructureNode } from '../lib/api.js';
import { TRACK_LABELS } from '../lib/discipline.js';
import LiquidButton from '../components/LiquidButton.jsx';

const NODE_TYPES = {
  HIGH_SCHOOL: [['class', 'Classes'], ['trade', 'Trades'], ['role', 'Roles']],
  UNIVERSITY: [['faculty', 'Faculties'], ['academic_department', 'Academic departments'], ['program', 'Programs'], ['year_of_study', 'Years of study'], ['cohort', 'Cohorts']],
  COMPANY: [['department', 'Departments'], ['office', 'Offices'], ['role', 'Roles']],
  ORGANIZATION: [['department', 'Departments'], ['office', 'Offices'], ['role', 'Roles']],
  COMMUNITY: [['role', 'Roles'], ['cohort', 'Cohorts']]
};

export default function StructureView({ orgId, track, canWrite, isAdmin }) {
  const types = NODE_TYPES[track] || NODE_TYPES.ORGANIZATION;
  const [nodes, setNodes] = useState(null);
  const [activeType, setActiveType] = useState(types[0][0]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setNodes(null); setError('');
    (async () => {
      try {
        const { data } = await listStructureNodes(orgId);
        if (!cancelled) setNodes(data);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  useEffect(() => {
    if (!types.some(([k]) => k === activeType)) setActiveType(types[0][0]);
  }, [track]);

  const visible = (nodes || []).filter(n => n.node_type === activeType);
  const currentLabel = types.find(t => t[0] === activeType)?.[1] || 'Nodes';

  async function add(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true); setError('');
    try {
      await createStructureNode({ organization_id: orgId, node_type: activeType, name: newName.trim() });
      setNewName(''); setAdding(false);
      const { data } = await listStructureNodes(orgId);
      setNodes(data);
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  }

  async function remove(node) {
    if (!window.confirm(`Delete "${node.name}"?`)) return;
    setError('');
    try {
      await deleteStructureNode(node.id, orgId);
      const { data } = await listStructureNodes(orgId);
      setNodes(data);
    } catch (e) { setError(e.message); }
  }

  return (
    <section className="view">
      <div className="row-between">
        <h2 className="page-title">Structure</h2>
        {canWrite && (
          <LiquidButton onClick={() => setAdding(!adding)}>
            {adding ? 'Cancel' : `+ Add ${currentLabel.toLowerCase()}`}
          </LiquidButton>
        )}
      </div>
      <p className="muted">{TRACK_LABELS[track]} structure — used by people, incidents, and reports.</p>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="filter-row">
        {types.map(([key, label]) => (
          <button key={key} className={`tab${activeType === key ? ' active' : ''}`} onClick={() => setActiveType(key)}>{label}</button>
        ))}
      </div>

      {adding && (
        <form className="card form-card" onSubmit={add}>
          <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder={`New ${currentLabel.slice(0, -1).toLowerCase()} name`} required />
          <div className="form-actions"><LiquidButton type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add'}</LiquidButton></div>
        </form>
      )}

      {nodes ? (
        <>
          {visible.length === 0 ? (
            <p className="muted">Nothing here yet. Add your first {currentLabel.toLowerCase()}.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Type</th>{isAdmin && <th></th>}</tr></thead>
                <tbody>
                  {visible.map(n => (
                    <tr key={n.id}>
                      <td>{n.name}</td>
                      <td><span className="pill">{n.node_type}</span></td>
                      {isAdmin && <td><button className="link danger" onClick={() => remove(n)}>Delete</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </section>
  );
}
