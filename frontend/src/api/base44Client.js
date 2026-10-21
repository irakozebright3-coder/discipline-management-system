// Thin parity layer: the original Base44 app imported its API client from here.
// All calls go through the shared API layer (same-origin on Vercel).
export * from '../lib/api.js';
