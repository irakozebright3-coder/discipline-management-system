export default function LiquidButton({ children, ...rest }) {
  return (
    <button className="liquid-btn" {...rest}>
      <span className="liquid-btn__label">{children}</span>
    </button>
  );
}
