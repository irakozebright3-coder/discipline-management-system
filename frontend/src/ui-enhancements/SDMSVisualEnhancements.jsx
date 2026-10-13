import { useEffect } from 'react';
import './sdms-ui.css';
import { initCircleDotCursor, initLiquidButtons } from './sdms-ui.js';

/** Render once inside the existing app; this does not replace routes or providers. */
export default function SDMSVisualEnhancements() {
  useEffect(() => {
    const cleanCursor = initCircleDotCursor();
    const cleanButtons = initLiquidButtons(document);
    return () => { cleanCursor?.(); cleanButtons?.(); };
  }, []);
  return null;
}
