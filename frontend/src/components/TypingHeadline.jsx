import { useEffect, useRef, useState } from 'react';

// Spreads the first `n` typed characters across the lines (each line break counts as one keystroke).
export function sliceLines(lines, n) {
  let left = n;
  return lines.map(line => {
    const take = Math.max(0, Math.min(line.text.length, left));
    left -= line.text.length + 1;
    return { ...line, shown: line.text.slice(0, take) };
  });
}

// Types each phrase out letter by letter, holds it, erases it, then moves to the next one, forever.
// Each phrase is an array of lines; a line can be plain text or { text, accent: true } to highlight it.
// The complete text is always available to screen readers, and reduced-motion users get static text.
export default function TypingHeadline({ phrases, typeMs = 70, eraseMs = 32, holdMs = 1900, gapMs = 350 }) {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const flat = phrases.map(p => p.lines.map(l => l.text).join('\n'));
  const [pi, setPi] = useState(0);        // which phrase
  const [n, setN] = useState(reduceMotion ? flat[0].length : 0); // characters showing
  const phase = useRef('typing');

  useEffect(() => {
    if (reduceMotion) return undefined;
    let t;
    const full = flat[pi].length;
    const tick = () => {
      if (phase.current === 'typing') {
        if (n < full) { t = setTimeout(() => setN(n + 1), typeMs); }
        else { phase.current = 'holding'; t = setTimeout(() => { phase.current = 'erasing'; setN(n - 1); }, holdMs); }
      } else if (phase.current === 'erasing') {
        if (n > 0) { t = setTimeout(() => setN(n - 1), eraseMs); }
        else { phase.current = 'typing'; t = setTimeout(() => setPi((pi + 1) % phrases.length), gapMs); }
      }
    };
    tick();
    return () => clearTimeout(t);
  }, [n, pi]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = sliceLines(phrases[pi].lines, n);
  // The cursor sits at the end of the last line that has any characters showing.
  let cursorLine = 0;
  lines.forEach((l, i) => { if (l.shown.length > 0) cursorLine = i; });

  // An invisible copy of the longest phrase reserves the final height up front, so the text below never jumps
  // as lines appear, and no empty gap is left under the line that is currently being typed.
  const longest = phrases.reduce((a, b) => (b.lines.map(l => l.text).join('').length > a.lines.map(l => l.text).join('').length ? b : a));

  return (
    <h1 className="dm-hero-title dm-typing">
      <span className="dm-sr-only">{phrases[0].lines.map(l => l.text).join(' ')}</span>
      <span className="dm-typing-stack" aria-hidden="true">
        <span className="dm-typing-ghost">
          {longest.lines.map((l, i) => <span key={i} className="dm-typing-line">{l.text}</span>)}
        </span>
        <span className="dm-typing-lines">
          {lines.map((l, i) => (
            <span key={i} className={`dm-typing-line${l.accent ? ' dm-title-gradient' : ''}`}>
              {l.shown}
              {i === cursorLine && <span className="dm-caret" />}
            </span>
          ))}
        </span>
      </span>
    </h1>
  );
}
