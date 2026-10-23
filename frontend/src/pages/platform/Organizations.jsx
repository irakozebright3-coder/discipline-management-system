import { useEffect, useState } from 'react';
import { platformGet, platformPatch } from '../../lib/api.js';
import SearchBar from '../../components/SearchBar.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export default function Organizations() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async (q = search) => {
    try {
      const { data } = await platformGet(`institutions${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setRows(data);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(''); }, []);
  useEffect(() => { if (rows) load(search); }, [search]);

  const setStatus = async (inst, status) => {
    setBusyId(inst.id); setError(''); setNotice('');
    try {
      await platformPatch(`institutions/${inst.id}`, { status });
      setNotice(`${inst.name} is now ${status}.`);
      await load(search);
    } catch (e) { setError(e.message); } finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Institutions</h1>
        <p className="text-sm text-muted-foreground">Every institution on the platform, with its track and status.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search name, track, status…" ariaLabel="Search institutions" className="max-w-sm" />
      {!rows ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Track</th><th className="p-3 font-medium">Members</th>
              <th className="p-3 font-medium">Status</th><th className="p-3 font-medium"></th>
            </tr></thead>
            <tbody>
              {rows.map(i => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{i.name}</td>
                  <td className="p-3">{i.type}</td>
                  <td className="p-3">{i.track}</td>
                  <td className="p-3">{i.member_count}</td>
                  <td className="p-3"><Badge variant={i.status === 'active' ? 'default' : 'secondary'}>{i.status}</Badge></td>
                  <td className="p-3 space-x-3">
                    {i.status !== 'archived' && (
                      <button className="text-sm text-primary hover:underline" disabled={busyId === i.id}
                        onClick={() => setStatus(i, i.status === 'active' ? 'suspended' : 'active')}>
                        {i.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                    <button className="text-sm text-destructive hover:underline" disabled={busyId === i.id}
                      onClick={() => setStatus(i, 'archived')}>Archive</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-muted-foreground">No institutions match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
