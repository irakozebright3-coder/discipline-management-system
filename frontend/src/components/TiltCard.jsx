import { useRef } from 'react';

export default function TiltCard({ className, children }) {
  const el = useRef(null);
  const canTilt = () =>
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onMove(e) {
    if (!canTilt() || !el.current) return;
    const r = el.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    // Clamp the pull: never let the element leave its hit box.
    el.current.style.setProperty('--rx', `${(-py * 8).toFixed(2)}deg`);
    el.current.style.setProperty('--ry', `${(px * 10).toFixed(2)}deg`);
    el.current.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
    el.current.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
  }
  function onLeave() {
    if (!el.current) return;
    el.current.style.setProperty('--rx', '0deg');
    el.current.style.setProperty('--ry', '0deg');
  }

  return (
    <div ref={el} className={`tilt-card${className ? ' ' + className : ''}`}
      onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  );
}
