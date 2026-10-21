import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight, ArrowRight, BarChart3, Briefcase, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, FileCheck2, GitBranch, GraduationCap,
  HeartHandshake, Layers, LockKeyhole, School, Search, ShieldCheck, Sparkles, Users
} from 'lucide-react';
import { getCommunityStats, getCreatorProfile } from '../lib/api.js';
import MemberGallery from '../components/MemberGallery.jsx';
import { TRACKS, membersByTrack } from '../lib/memberGallery.js';
import '../styles/landing.css';

const ROTATING_AUDIENCES = ['schools', 'universities', 'organizations'];

const TRACK_ICONS = {
  HIGH_SCHOOL: School,
  UNIVERSITY: GraduationCap,
  COMPANY: Briefcase,
  ORGANIZATION: HeartHandshake,
  COMMUNITY: Users
};

const TRACK_TEXT = {
  HIGH_SCHOOL: 'Track conduct, term marks, counselling follow-ups and student history with a clear 40-mark starting score.',
  UNIVERSITY: 'Review misconduct, academic integrity cases, decisions and appeals across faculties and cohorts.',
  COMPANY: 'Record policy and safety incidents, assign corrective actions and maintain an accountable audit trail.',
  ORGANIZATION: 'Manage conduct cases across branches and offices with clear review and appeal stages.',
  COMMUNITY: 'Document code-of-conduct cases, follow-ups and outcomes for members and volunteers.'
};

const SPOTLIGHT_MEMBERS = [0, 1].flatMap((personIndex) =>
  TRACKS.map((track) => membersByTrack(track.key)[personIndex]).filter(Boolean)
);

const SHOWCASES = [
  {
    key: 'school',
    label: 'High School',
    eyebrow: 'ACADEMIC DISCIPLINE',
    title: 'Every term. Every mark. In view.',
    description: 'See term scores, approved deductions and annual results together, with the reason and date behind every change.',
    href: '/tracks/high-school',
    metrics: [{ value: '35/40', label: 'Term score' }, { value: '5', label: 'Approved deductions' }, { value: '87.5%', label: 'Term percentage' }],
    activity: [42, 68, 51, 81, 60, 90, 70],
    records: [['Student 014', 'Late coming', 'Reviewed'], ['Student 027', 'Uniform policy', 'Confirmed'], ['Student 031', 'Counselling follow-up', 'Scheduled']]
  },
  {
    key: 'university',
    label: 'University',
    eyebrow: 'CASE MANAGEMENT',
    title: 'A clear process for complex cases.',
    description: 'Follow reports through assignment, review, decision and appeal without losing the context or the history.',
    href: '/tracks/university',
    metrics: [{ value: '24', label: 'Assigned cases' }, { value: '8', label: 'Awaiting review' }, { value: '16', label: 'Resolved this month' }],
    activity: [32, 58, 46, 76, 59, 84, 67],
    records: [['Case DM-1024', 'Academic integrity', 'Under review'], ['Case DM-1028', 'Code of conduct', 'Awaiting decision'], ['Case DM-1031', 'Appeal review', 'Assigned']]
  },
  {
    key: 'organization',
    label: 'Organizations',
    eyebrow: 'TEAM ACCOUNTABILITY',
    title: 'Consistent records across every team.',
    description: 'Organize reports, investigations and corrective actions across departments, offices and branches.',
    href: '/tracks/organization',
    metrics: [{ value: '128', label: 'People managed' }, { value: '12', label: 'Open cases' }, { value: '92%', label: 'Follow-up completion' }],
    activity: [55, 39, 62, 51, 74, 61, 88],
    records: [['Case DM-204', 'Policy violation', 'Assigned'], ['Case DM-208', 'Workplace conduct', 'Under review'], ['Case DM-211', 'Follow-up check', 'Scheduled']]
  },
  {
    key: 'history',
    label: 'History & reports',
    eyebrow: 'INSIGHT AND OVERSIGHT',
    title: 'From record to reliable report.',
    description: 'Search past activity, filter by time period and create consistent exports from the records you are allowed to access.',
    href: '/register',
    metrics: [{ value: '4', label: 'Date filters' }, { value: 'CSV', label: 'Export format' }, { value: '1 view', label: 'Case timeline' }],
    activity: [28, 42, 61, 49, 73, 65, 94],
    records: [['October report', 'Custom date range', 'Ready to preview'], ['Term summary', 'Academic results', 'Ready to preview'], ['Audit history', 'Staff activity', 'Searchable']]
  }
];

const FEATURES = [
  { icon: Users, title: 'People and profiles', text: 'Keep student, staff and member records organized, searchable and connected to their institutional context.' },
  { icon: GitBranch, title: 'Structured case workflow', text: 'Move cases from report to review, decision, appeal and closure with a clear timeline.' },
  { icon: ShieldCheck, title: 'Roles and permissions', text: 'Present the right tools to each role, backed by server-side authorization and organization-level boundaries.' },
  { icon: FileCheck2, title: 'History that stays useful', text: 'See the context behind decisions, approved changes, follow-ups and historical records.' },
  { icon: BarChart3, title: 'Reports and insights', text: 'Filter information by date, track, category, status and department, then export authorized results.' },
  { icon: LockKeyhole, title: 'Accountable administration', text: 'Connect settings and user actions to an audit trail rather than relying on disconnected spreadsheets.' }
];

function ProductPreview({ slide }) {
  return (
    <div className="dm-preview-window" key={slide.key} aria-label={`Illustrative ${slide.label} dashboard preview`}>
      <div className="dm-preview-bar">
        <div className="dm-preview-brand"><span>DM</span><b>Workspace</b></div>
        <div className="dm-preview-search"><Search size={13} /> Search records</div>
        <div className="dm-preview-avatar" aria-hidden="true">IB</div>
      </div>
      <div className="dm-preview-layout">
        <aside className="dm-preview-sidebar" aria-hidden="true">
          <span className="is-active"><Layers size={14} /> Overview</span>
          <span><Users size={14} /> People</span>
          <span><FileCheck2 size={14} /> Incidents</span>
          <span><Clock3 size={14} /> History</span>
          <span><BarChart3 size={14} /> Reports</span>
        </aside>
        <div className="dm-preview-main">
          <div className="dm-preview-heading">
            <div><span className="dm-preview-overline">WORKSPACE PREVIEW</span><h3>{slide.label} overview</h3></div>
            <span className="dm-preview-status"><span /> Sample view</span>
          </div>
          <div className="dm-preview-metrics">
            {slide.metrics.map((item) => (
              <div className="dm-preview-metric" key={item.label}>
                <span>{item.label}</span><strong>{item.value}</strong><small><ArrowDownRight size={12} /> Illustrative value</small>
              </div>
            ))}
          </div>
          <div className="dm-preview-lower">
            <div className="dm-preview-chart">
              <div className="dm-preview-block-heading"><b>Activity overview</b><span>Sample data</span></div>
              <div className="dm-bars" aria-label="Illustrative activity chart">
                {slide.activity.map((height, i) => <span key={i} style={{ height: height + '%' }} />)}
              </div>
              <div className="dm-chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
            </div>
            <div className="dm-preview-records">
              <div className="dm-preview-block-heading"><b>Recent records</b><span>Preview</span></div>
              {slide.records.map((record) => (
                <div className="dm-preview-record" key={record[0]}>
                  <span className="dm-record-mark"><FileCheck2 size={13} /></span>
                  <span className="dm-record-copy"><b>{record[0]}</b><small>{record[1]}</small></span>
                  <span className="dm-record-state">{record[2]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [stats, setStats] = useState(null);
  const [creator, setCreator] = useState(null);
  const [audienceIndex, setAudienceIndex] = useState(0);
  const [activeShowcase, setActiveShowcase] = useState(0);
  const swipeStart = useRef(null);

  useEffect(() => {
    let active = true;
    getCommunityStats()
      .then(({ data }) => { if (active && data) setStats(data); })
      .catch(() => { if (active) setStats(null); });
    getCreatorProfile()
      .then(({ data }) => { if (active && data) setCreator(data); })
      .catch(() => { if (active) setCreator(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;
    const timer = window.setInterval(() => {
      setAudienceIndex((index) => (index + 1) % ROTATING_AUDIENCES.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) return undefined;
    const targets = Array.from(document.querySelectorAll('.dm-landing [data-reveal]'));
    if (!targets.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('dm-reveal-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    targets.forEach((target) => {
      target.classList.add('dm-reveal-pending');
      observer.observe(target);
    });
    return () => observer.disconnect();
  }, []);

  const slide = SHOWCASES[activeShowcase];
  const showPrevious = () => setActiveShowcase((index) => (index - 1 + SHOWCASES.length) % SHOWCASES.length);
  const showNext = () => setActiveShowcase((index) => (index + 1) % SHOWCASES.length);
  const handlePreviewPointerDown = (event) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const handlePreviewPointerUp = (event) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || (event.pointerType !== 'touch' && event.pointerType !== 'pen')) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      if (deltaX < 0) showNext();
      else showPrevious();
    }
  };

  return (
    <main className="dm-landing">
      <section className="dm-hero">
        <div className="dm-hero-grid-glow" aria-hidden="true" />
        <div className="dm-hero-inner">
          <div className="dm-hero-copy">
            <div className="dm-owner-pill"><Sparkles size={14} /><span>Built by <strong>{creator?.full_name || 'IRAKOZE Bright'}</strong></span><span className="dm-pill-separator">·</span><span>Discipline Management</span></div>
            <div className="dm-eyebrow"><span className="dm-eyebrow-dot" /> One platform · Five institution tracks</div>
            <h1 className="dm-hero-title">
              Discipline with <span className="dm-title-gradient">clarity.</span><br />
              Designed for <span className="dm-rotator-window" aria-hidden="true"><span key={ROTATING_AUDIENCES[audienceIndex]} className="dm-rotator-word">{ROTATING_AUDIENCES[audienceIndex]}.</span></span>
              <span className="dm-sr-only"> schools, universities, and organizations.</span>
            </h1>
            <p className="dm-hero-description">
              A connected workspace for people, incidents, decisions and reporting — built to make discipline management more consistent, transparent and accountable.
            </p>
            <div className="dm-hero-actions">
              <Link to="/register" className="dm-button dm-button-primary">Get started <ArrowRight size={17} /></Link>
              <a href="#product-preview" className="dm-button dm-button-secondary">Explore the platform <ArrowDownRight size={17} /></a>
            </div>
            <div className="dm-hero-assurance">
              <span><CheckCircle2 size={15} /> Track-specific workflows</span>
              <span><CheckCircle2 size={15} /> Searchable history</span>
              <span><CheckCircle2 size={15} /> Role-aware access</span>
            </div>
          </div>

          <div className="dm-hero-visual" aria-label="Illustrative Discipline Management dashboard" role="img">
            <div className="dm-orb dm-orb-one" aria-hidden="true" />
            <div className="dm-orb dm-orb-two" aria-hidden="true" />
            <div className="dm-hero-ring dm-ring-one" aria-hidden="true" />
            <div className="dm-hero-ring dm-ring-two" aria-hidden="true" />
            <div className="dm-hero-glass-card">
              <div className="dm-window-bar"><div className="dm-window-dots"><i /><i /><i /></div><span>dm.workspace</span><span className="dm-window-lock"><LockKeyhole size={12} /> Secure workspace</span></div>
              <div className="dm-hero-dashboard">
                <aside className="dm-hero-mini-sidebar"><div className="dm-mini-logo">DM</div><span className="active"><Layers size={15} /></span><span><Users size={15} /></span><span><FileCheck2 size={15} /></span><span><BarChart3 size={15} /></span></aside>
                <div className="dm-hero-mini-main">
                  <div className="dm-hero-mini-heading"><div><small>INSTITUTION OVERVIEW</small><h2>Good afternoon, Admin</h2><p>Here is your workspace at a glance.</p></div><span className="dm-mini-avatar">A</span></div>
                  <div className="dm-hero-stat-grid">
                    <div><span>People</span><b>248</b><small><span className="dm-mini-trend">↗</span> Example data</small></div>
                    <div><span>Open cases</span><b>18</b><small><span className="dm-mini-trend">●</span> In review</small></div>
                    <div><span>Follow-ups</span><b>06</b><small>Due this week</small></div>
                  </div>
                  <div className="dm-hero-mini-panels">
                    <div className="dm-mini-chart-panel"><div className="dm-mini-panel-title"><b>Case activity</b><span>Illustrative</span></div><div className="dm-mini-chart-bars">{[36, 58, 44, 73, 53, 84, 67, 92, 61, 74].map((h, i) => <i key={i} style={{ height: h + '%' }} />)}</div><div className="dm-mini-chart-axis"><span>Week 1</span><span>Week 4</span></div></div>
                    <div className="dm-mini-activity-panel"><div className="dm-mini-panel-title"><b>Latest updates</b><span>Preview</span></div><div className="dm-mini-activity-row"><span className="dm-activity-icon mint"><CheckCircle2 size={13} /></span><span><b>Review recorded</b><small>Case status updated</small></span></div><div className="dm-mini-activity-row"><span className="dm-activity-icon blue"><FileCheck2 size={13} /></span><span><b>New report</b><small>Awaiting assignment</small></span></div><div className="dm-mini-activity-row"><span className="dm-activity-icon purple"><Clock3 size={13} /></span><span><b>Follow-up due</b><small>Scheduled for review</small></span></div></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dm-float-card dm-float-approved"><span className="dm-float-icon"><CheckCircle2 size={17} /></span><span><b>Decision recorded</b><small>History stays connected</small></span></div>
            <div className="dm-float-card dm-float-audit"><span className="dm-float-icon blue"><ShieldCheck size={17} /></span><span><b>Audit-ready timeline</b><small>Actions with context</small></span></div>
            <div className="dm-hero-note"><span className="dm-hero-note-dot" />Illustrative interface · Not live records</div>
          </div>
        </div>
        <div className="dm-hero-bottom-fade" aria-hidden="true" />
      </section>

      {stats && (
        <section className="dm-live-stats" aria-label="Live platform statistics" data-reveal>
          <div className="dm-live-stats-inner">
            <div><span className="dm-live-stat-value">{stats.institutions ?? stats.organizations ?? 0}</span><span className="dm-live-stat-label">Institutions</span></div>
            <div><span className="dm-live-stat-value">{stats.people ?? 0}</span><span className="dm-live-stat-label">People managed</span></div>
            <div><span className="dm-live-stat-value">{stats.incidents ?? 0}</span><span className="dm-live-stat-label">Cases recorded</span></div>
            <div><span className="dm-live-stat-value">{stats.visitors ?? 0}</span><span className="dm-live-stat-label">Site visits</span></div>
          </div>
        </section>
      )}

      <section className="dm-section dm-showcase-section" id="product-preview" data-reveal>
        <div className="dm-section-heading">
          <span className="dm-section-kicker">SEE THE WORKFLOW</span>
          <h2>One platform. <span className="dm-title-gradient">Clearer decisions.</span></h2>
          <p>Explore how DM presents discipline records, case workflows and operational reports. These previews use illustrative data.</p>
        </div>
        <div className="dm-showcase-layout">
          <div className="dm-showcase-copy" aria-live="polite">
            <div className="dm-showcase-counter"><span>{String(activeShowcase + 1).padStart(2, '0')}</span><i />{String(SHOWCASES.length).padStart(2, '0')}</div>
            <span className="dm-section-kicker">{slide.eyebrow}</span>
            <h3>{slide.title}</h3>
            <p>{slide.description}</p>
            <Link to={slide.href} className="dm-text-link">Explore {slide.label.toLowerCase()} <ArrowRight size={16} /></Link>
            <div className="dm-carousel-controls" aria-label="Product preview controls">
              <button type="button" onClick={showPrevious} aria-label="Previous product preview"><ChevronLeft size={18} /></button>
              <button type="button" onClick={showNext} aria-label="Next product preview"><ChevronRight size={18} /></button>
              <span>Use arrows to explore</span>
            </div>
          </div>
          <div
            className="dm-showcase-preview"
            role="region"
            aria-roledescription="carousel"
            aria-label="Product interface previews. On touch screens, swipe left or right to change slides."
            onPointerDown={handlePreviewPointerDown}
            onPointerUp={handlePreviewPointerUp}
            onPointerCancel={() => { swipeStart.current = null; }}
          >
            <ProductPreview slide={slide} />
            <div className="dm-showcase-dots" aria-label="Choose product preview">
              {SHOWCASES.map((item, index) => <button key={item.key} type="button" className={index === activeShowcase ? 'active' : ''} onClick={() => setActiveShowcase(index)} aria-label={`Show ${item.label} preview`} aria-current={index === activeShowcase ? 'true' : undefined} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="dm-section dm-tracks-section" id="tracks" data-reveal>
        <div className="dm-section-heading">
          <span className="dm-section-kicker">FIVE TRACKS · ONE STANDARD</span>
          <h2>Built around <span className="dm-title-gradient">your institution.</span></h2>
          <p>Each track gets its own language, structure and workflow, while keeping the same commitment to clear records and accountable decisions.</p>
        </div>
        <div className="dm-track-grid">
          {TRACKS.map((track) => {
            const Icon = TRACK_ICONS[track.key] || Users;
            const people = membersByTrack(track.key);
            return (
              <article className="dm-track-card" key={track.key}>
                <div className="dm-track-icon"><Icon size={21} /></div>
                <span className="dm-track-count">{people.length} illustrative profiles</span>
                <h3>{track.label}</h3>
                <p>{TRACK_TEXT[track.key]}</p>
                <Link to={`/tracks/${track.path}`} className="dm-track-link">Explore track <ArrowRight size={15} /></Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dm-section dm-features-section" id="features" data-reveal>
        <div className="dm-section-heading">
          <span className="dm-section-kicker">BUILT FOR THE DETAILS</span>
          <h2>Everything connected.<br /><span className="dm-title-gradient">Nothing left unclear.</span></h2>
          <p>Move from scattered files to consistent workflows that help authorized teams review what happened and what comes next.</p>
        </div>
        <div className="dm-bento-grid">
          {FEATURES.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className={`dm-feature-card dm-feature-${index + 1}`}>
              <div className="dm-feature-card-top"><span className="dm-feature-icon"><Icon size={20} /></span><span className="dm-feature-number">0{index + 1}</span></div>
              <h3>{title}</h3><p>{text}</p>
              <span className="dm-feature-orb" aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="dm-section dm-people-section" data-reveal>
        <div className="dm-people-heading">
          <div><span className="dm-section-kicker">PEOPLE-FIRST BY DESIGN</span><h2>Designed for the people <span className="dm-title-gradient">behind every record.</span></h2></div>
          <p>Illustrative profile examples across all five tracks. Real institution records remain private and are shown only to authorized users.</p>
        </div>
        <div className="dm-gallery-wrap"><MemberGallery members={SPOTLIGHT_MEMBERS} limit={10} showRoles={true} /></div>
      </section>

      <section className="dm-final-cta" data-reveal>
        <div className="dm-cta-glow" aria-hidden="true" />
        <div className="dm-final-cta-content">
          <span className="dm-section-kicker">READY TO GET ORGANIZED?</span>
          <h2>Make every record<br /><span className="dm-title-gradient">clearer and more accountable.</span></h2>
          <p>Set up your institution, choose your track and start building a more consistent discipline workflow.</p>
          <div className="dm-hero-actions">
            <Link to="/register" className="dm-button dm-button-primary">Create your workspace <ArrowRight size={17} /></Link>
            <Link to="/help" className="dm-button dm-button-secondary">Visit the Help Center</Link>
          </div>
        </div>
        <div className="dm-cta-mark" aria-hidden="true"><div className="dm-cta-mark-inner">DM</div><span>Discipline Management</span></div>
      </section>
    </main>
  );
}
