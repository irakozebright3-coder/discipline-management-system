import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CircleHelp, RefreshCw } from 'lucide-react';
import { getFaqs } from '../lib/api.js';
import { Button } from '../components/ui/button.jsx';

export default function Faqs() {
  const [faqs, setFaqs] = useState(null);
  const [error, setError] = useState('');

  const loadFaqs = () => {
    setFaqs(null);
    setError('');
    getFaqs()
      .then(({ data }) => setFaqs(Array.isArray(data) ? data : []))
      .catch((err) => {
        setFaqs([]);
        setError(err?.message || 'We could not load the FAQs right now.');
      });
  };

  useEffect(() => { loadFaqs(); }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 md:py-16">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><CircleHelp className="h-6 w-6" /></span>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">QUICK ANSWERS</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Frequently asked questions</h1>
        <p className="mt-4 leading-7 text-muted-foreground">Answers published by the Discipline Management platform team.</p>
      </div>

      {faqs === null ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground" role="status"><RefreshCw className="h-4 w-4 animate-spin" /> Loading FAQs…</div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm" role="alert"><p>{error}</p><Button className="mt-3" variant="outline" onClick={loadFaqs}><RefreshCw className="h-4 w-4" /> Try again</Button></div>
      ) : faqs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">No FAQs have been published yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">The FAQ list is managed by the platform team. You can browse the Help Center or send a support request in the meantime.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3"><Link to="/help"><Button variant="outline">Open Help Center</Button></Link><Link to="/contact"><Button>Contact support <ArrowRight className="h-4 w-4" /></Button></Link></div>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.id} className="group rounded-xl border border-border bg-card px-5 py-4 open:border-primary/30 open:bg-card/90">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-ring">
                <span>{faq.title}</span><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="whitespace-pre-line pt-3 text-sm leading-7 text-muted-foreground">{faq.content}</p>
            </details>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-xl border border-border bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div><h2 className="font-semibold">Need a little more help?</h2><p className="mt-1 text-sm text-muted-foreground">Use the Help Center or send the team a message.</p></div>
        <div className="mt-4 flex gap-2 sm:mt-0"><Link to="/help"><Button variant="outline">Help Center</Button></Link><Link to="/contact"><Button>Contact us</Button></Link></div>
      </div>
    </main>
  );
}
