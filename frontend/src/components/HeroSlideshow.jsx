import { useEffect, useState } from 'react';
import { HERO_SLIDES } from '../lib/heroSlides.js';

// Full-bleed background photos that crossfade, with a dark overlay so the headline stays readable.
// Renders nothing when there are no photos, so the hero keeps its normal dark gradient.
export default function HeroSlideshow({ interval = 6000 }) {
  const slides = HERO_SLIDES;
  const [active, setActive] = useState(0);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (slides.length < 2 || reduceMotion) return undefined;
    const t = setInterval(() => setActive(i => (i + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [slides.length, interval, reduceMotion]);

  // Warm the next image so the crossfade never flashes empty.
  useEffect(() => {
    if (slides.length < 2) return;
    const img = new Image(); img.src = slides[(active + 1) % slides.length].src;
  }, [active, slides]);

  if (!slides.length) return null;
  return (
    <div className="dm-slideshow" aria-hidden="true">
      {slides.map((s, i) => (
        <img key={s.src} src={s.src} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async"
          className={`dm-slide${i === active ? ' is-active' : ''}`} />
      ))}
      <div className="dm-slideshow-overlay" />
      {slides.length > 1 && (
        <div className="dm-slideshow-dots">
          {slides.map((s, i) => <button key={s.src} type="button" tabIndex={-1} className={i === active ? 'is-active' : ''} onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`} />)}
        </div>
      )}
    </div>
  );
}
