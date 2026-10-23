import { useEffect, useState } from 'react';
import { platformGet, platformPut } from '../../lib/api.js';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';
import { Textarea } from '../../components/ui/textarea.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.jsx';

export default function CreatorProfileManage() {
  const [creator, setCreator] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    platformGet('owner-profile').then(({ data }) => setCreator(data)).catch(e => setError(e.message));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const { data } = await platformPut('owner-profile', creator);
      setCreator(data); setNotice('Profile saved.');
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Creator profile</h1>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}
      {creator && (
        <Card>
          <CardHeader><CardTitle>Shown on the public About, Community, and Home pages</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1.5"><Label>Name</Label>
                <Input value={creator.full_name || ''} onChange={e => setCreator({ ...creator, full_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Title</Label>
                <Input value={creator.title || ''} onChange={e => setCreator({ ...creator, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Biography</Label>
                <Textarea rows={5} value={creator.biography || ''} onChange={e => setCreator({ ...creator, biography: e.target.value })} /></div>
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
