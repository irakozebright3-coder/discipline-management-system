import { useEffect, useState } from 'react';
import { platformGet, platformPatch } from '../../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';
import { Badge } from '../../components/ui/badge.jsx';

export default function SystemControl() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    platformGet('settings').then(({ data }) => setConfig(data)).catch(e => setError(e.message));
  }, []);

  const patch = async (payload) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const { data } = await platformPatch('settings', payload);
      setConfig(data); setNotice('Configuration saved.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">System control</h1>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary">{notice}</p>}
      {config && (
        <>
          <Card>
            <CardHeader><CardTitle>Maintenance mode</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Currently: <Badge variant={config.maintenance_mode ? 'destructive' : 'secondary'}>{config.maintenance_mode ? 'ON' : 'OFF'}</Badge>
              </p>
              <Button variant={config.maintenance_mode ? 'outline' : 'destructive'} disabled={busy}
                onClick={() => patch({ maintenance_mode: !config.maintenance_mode })}>
                {config.maintenance_mode ? 'Turn off' : 'Turn on'}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>System health & version</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); patch({ system_health: config.system_health, system_version: config.system_version }); }}>
                <div className="space-y-1.5"><Label>System health</Label>
                  <Input value={config.system_health || ''} onChange={e => setConfig({ ...config, system_health: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>System version</Label>
                  <Input value={config.system_version || ''} onChange={e => setConfig({ ...config, system_version: e.target.value })} /></div>
                <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
