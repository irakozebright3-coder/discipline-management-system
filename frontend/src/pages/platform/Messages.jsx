import { useEffect, useMemo, useState } from 'react';
import { Send, Save, Trash2, Copy, Mail, Phone, Users, AlertTriangle, PenLine } from 'lucide-react';
import { platformGet, platformPost, platformPatch, platformDelete } from '../../lib/api.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.jsx';

const AUDIENCES = [
  { value: 'all', label: 'Everyone', icon: Users },
  { value: 'email', label: 'Emails only', icon: Mail },
  { value: 'phone', label: 'Phones only', icon: Phone }
];
const STATUS = {
  draft: { label: 'Draft', variant: 'outline' }, sent: { label: 'Sent', variant: 'default' }, partial: { label: 'Partly sent', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'destructive' }, recorded: { label: 'Saved, not emailed', variant: 'secondary' }
};
const EMPTY = { id: null, subject: '', body: '', audience: 'all' };

export default function Messages() {
  const [list, setList] = useState(null);
  const [subs, setSubs] = useState([]);
  const [emailOn, setEmailOn] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [recipients, setRecipients] = useState(null);

  const load = async () => {
    try {
      const [m, s] = await Promise.all([platformGet('messages'), platformGet('subscribers')]);
      setList(m.data); setEmailOn(m.email_delivery); setSubs(s.data.filter(x => x.status === 'active')); setError('');
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const emails = subs.filter(s => s.contact_type === 'email').length;
    const phones = subs.filter(s => s.contact_type === 'phone').length;
    return { emails, phones, forAudience: form.audience === 'email' ? emails : form.audience === 'phone' ? phones : emails + phones };
  }, [subs, form.audience]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(''), 5000); };

  const save = async () => {
    setBusy(true); setError('');
    try {
      const payload = { subject: form.subject, body: form.body, audience: form.audience };
      const r = form.id ? await platformPatch(`messages/${form.id}`, payload) : await platformPost('messages', payload);
      setForm({ id: r.data.id, subject: r.data.subject, body: r.data.body, audience: r.data.audience });
      flash('Draft saved.'); await load(); return r.data;
    } catch (e) { setError(e.message); return null; } finally { setBusy(false); }
  };

  const send = async () => {
    setBusy(true); setError('');
    try {
      const saved = await save(); if (!saved) { setConfirmSend(false); return; }
      const r = await platformPost(`messages/${saved.id}/send`);
      setRecipients(r.recipients); setForm(EMPTY); setConfirmSend(false);
      flash(r.data.delivery_note || `Sent to ${r.data.delivered} subscriber(s).`);
      await load();
    } catch (e) { setError(e.message); setConfirmSend(false); } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { await platformDelete(`messages/${toDelete.id}`); if (form.id === toDelete.id) setForm(EMPTY); setToDelete(null); flash('Message deleted.'); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const copy = async (text, what) => { try { await navigator.clipboard.writeText(text); flash(`${what} copied.`); } catch { setError('Copy failed. Select and copy manually.'); } };
  const valid = form.subject.trim().length >= 3 && form.body.trim().length >= 10;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages to subscribers</h1>
        <p className="text-sm text-muted-foreground">Write an update and send it to the people who subscribed on the website.</p>
      </div>

      {!emailOn && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="note">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p><b>Email sending is not switched on yet.</b> You can write and save messages now. To actually email them, add a <code>RESEND_API_KEY</code> to the site settings. Until then, use <b>Copy emails</b> after sending to paste them into your own email app. Text messages to phone numbers need an SMS service, which is not connected.</p>
        </div>
      )}
      {notice && <p className="rounded-md border border-emerald-600/40 bg-emerald-600/10 p-2.5 text-sm" role="status">{notice}</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2"><PenLine size={18} /> {form.id ? 'Edit draft' : 'Write a new update'}</CardTitle>
          {form.id && <Button variant="outline" size="sm" onClick={() => setForm(EMPTY)}>Start a new one</Button>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="msg-subject">Subject</Label>
            <Input id="msg-subject" value={form.subject} onChange={set('subject')} maxLength={200} placeholder="e.g. New: class portals are live" /></div>
          <div className="space-y-1.5"><Label htmlFor="msg-body">Message</Label>
            <textarea id="msg-body" value={form.body} onChange={set('body')} rows={9} maxLength={10000}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Write your update here. Leave a blank line between paragraphs." />
            <p className="text-xs text-muted-foreground">{form.body.length}/10000</p></div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Send to</legend>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map(a => (
                <label key={a.value} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${form.audience === a.value ? 'border-primary bg-primary/10' : ''}`}>
                  <input type="radio" name="aud" className="sr-only" checked={form.audience === a.value} onChange={() => setForm(f => ({ ...f, audience: a.value }))} />
                  <a.icon size={14} /> {a.label}
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{counts.forAudience} active subscriber{counts.forAudience === 1 ? '' : 's'} ({counts.emails} email, {counts.phones} phone).</p>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy || !valid} onClick={save}><Save size={14} /> Save draft</Button>
            <Button disabled={busy || !valid || counts.forAudience === 0} onClick={() => setConfirmSend(true)}><Send size={14} /> Send update</Button>
          </div>
        </CardContent>
      </Card>

      {recipients && (
        <Card><CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
          <span className="font-medium">Just sent. Need to send it yourself too?</span>
          {recipients.emails.length > 0 && <Button size="sm" variant="outline" onClick={() => copy(recipients.emails.join(', '), 'Emails')}><Copy size={13} /> Copy {recipients.emails.length} emails</Button>}
          {recipients.phones.length > 0 && <Button size="sm" variant="outline" onClick={() => copy(recipients.phones.join(', '), 'Phone numbers')}><Copy size={13} /> Copy {recipients.phones.length} phones</Button>}
          <Button size="sm" variant="ghost" onClick={() => setRecipients(null)}>Dismiss</Button>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          {!list ? <p className="text-sm text-muted-foreground">Loading…</p> : list.length === 0 ? <p className="text-sm text-muted-foreground">Nothing written yet.</p> : (
            <ul className="divide-y">
              {list.map(m => {
                const st = STATUS[m.status] || STATUS.draft;
                return (
                  <li key={m.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.subject}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{m.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(m.sent_at || m.created_at).toLocaleString()} · {m.audience === 'all' ? 'Everyone' : m.audience === 'email' ? 'Emails' : 'Phones'}
                        {m.status !== 'draft' && ` · ${m.delivered}/${m.recipients_total} delivered`}
                      </p>
                      {m.delivery_note && <p className="mt-1 text-xs text-amber-500">{m.delivery_note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {m.status === 'draft' && <Button size="sm" variant="outline" onClick={() => setForm({ id: m.id, subject: m.subject, body: m.body, audience: m.audience })}>Edit</Button>}
                      <Button size="sm" variant="ghost" aria-label={`Delete message ${m.subject}`} onClick={() => setToDelete(m)}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {confirmSend && (
        <ConfirmDialog title="Send this update?" confirmLabel={emailOn ? 'Send now' : 'Save as sent'} busy={busy} onConfirm={send} onCancel={() => setConfirmSend(false)}>
          <p><b>{form.subject}</b> will go to {counts.forAudience} subscriber{counts.forAudience === 1 ? '' : 's'}. This cannot be undone.</p>
          {!emailOn && <p className="mt-2 text-amber-500">Email sending is off, so nothing will be emailed. It will be recorded and you can copy the recipients.</p>}
        </ConfirmDialog>
      )}
      {toDelete && (
        <ConfirmDialog title="Delete this message?" busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)}>
          <p><b>{toDelete.subject}</b> will be removed from the history.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
