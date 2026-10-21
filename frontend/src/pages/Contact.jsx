import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Mail, MessageCircle, ShieldCheck, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { submitSupportRequest } from '../lib/api.js';

const EMPTY_FORM = { name: '', email: '', subject: '', message: '', website: '' };

export default function Contact() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError('');
    if (sent) setSent(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    setSent(false);
    try {
      await submitSupportRequest(form);
      setSent(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err?.message || 'We could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-[.82fr_1.18fr] md:gap-12 md:py-16">
      <section className="space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowRight className="h-4 w-4 rotate-180" /> Back to home
        </Link>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-primary">CONTACT THE DM TEAM</p>
          <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">Let’s make your workflow clearer.</h1>
          <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
            Ask a question about Discipline Management, report an issue or request help setting up your institution. Messages are sent to the platform support inbox.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
          <Card>
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MessageCircle className="h-5 w-5" /></span>
              <div><h2 className="font-semibold">Product support</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Tell us what you are trying to do and what went wrong. Please do not include sensitive student or case details.</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span>
              <div><h2 className="font-semibold">Privacy-conscious help</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Share only the information needed to understand your request. Do not send passwords or access tokens.</p></div>
            </CardContent>
          </Card>
        </div>
        <Link to="/help" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Browse the Help Center <ArrowRight className="h-4 w-4" /></Link>
      </section>

      <Card className="h-fit border-border/80 shadow-xl shadow-black/10">
        <CardHeader>
          <CardTitle className="text-xl">Send a message</CardTitle>
          <p className="text-sm text-muted-foreground">All fields are required. We will confirm here when your request is received.</p>
        </CardHeader>
        <CardContent>
          {sent && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300" role="status" aria-live="polite">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <span>Your message was received. Thank you for contacting Discipline Management.</span>
            </div>
          )}
          {error && <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><label htmlFor="contact-name" className="text-sm font-medium">Full name</label><input id="contact-name" name="name" autoComplete="name" required minLength={2} maxLength={120} value={form.name} onChange={update} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" placeholder="Your name" /></div>
              <div className="space-y-2"><label htmlFor="contact-email" className="text-sm font-medium">Email address</label><input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={update} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" placeholder="you@example.com" /></div>
            </div>
            <div className="space-y-2"><label htmlFor="contact-subject" className="text-sm font-medium">Subject</label><input id="contact-subject" name="subject" required minLength={3} maxLength={200} value={form.subject} onChange={update} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" placeholder="What do you need help with?" /></div>
            <div className="space-y-2"><label htmlFor="contact-message" className="text-sm font-medium">Message</label><textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={update} className="w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm leading-6 outline-none transition focus-visible:ring-2 focus-visible:ring-ring" placeholder="Describe your question or issue..." /><p className="text-right text-xs text-muted-foreground">{form.message.length}/5000</p></div>
            <div className="dm-contact-honeypot" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={update} /></div>
            <Button type="submit" className="h-11 w-full" disabled={sending}><Send className="h-4 w-4" />{sending ? 'Sending message…' : 'Send message'}</Button>
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Mail className="mt-0.5 h-4 w-4 shrink-0" />Submitting sends your message to the configured platform support system. Do not include passwords, tokens or confidential case evidence.</p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
