import { useEffect, useRef } from 'react';
import { initCanvasAmbientBackground } from './sdms-ui.js';

/** Place in a position:relative section; place foreground content above with z-index:1. */
export default function CanvasBackdrop({ className = '' }) {
  const canvasRef = useRef(null);
  useEffect(() => initCanvasAmbientBackground(canvasRef.current), []);
  return <canvas ref={canvasRef} className={className} data-sdms-canvas aria-hidden="true" style={{position:'absolute',inset:0,zIndex:0,pointerEvents:'none',opacity:.85}} />;
}
