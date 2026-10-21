export default function SlidingTitle({ words, speed = 1, className }) {
  return (
    <h1 className={`sliding-title${className ? ' ' + className : ''}`} aria-label={words.join(' ')}
      style={{ '--n': words.length, '--spd': speed }}>
      {words.map((w, i) => (
        <span key={i} className="sliding-word" style={{ '--i': i }}>{w}</span>
      ))}
    </h1>
  );
}
