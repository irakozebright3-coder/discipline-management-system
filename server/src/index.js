import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { requireAuth } from './middleware/auth.js';
import persons from './routes/persons.js';
import incidents from './routes/incidents.js';
import violations from './routes/violations.js';
import organizations from './routes/organizations.js';

const app = express();
const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);
app.use(helmet());
// CORS: allow same-origin requests (frontend + API share one Vercel domain)
// plus any origin listed in CORS_ORIGINS for local and split deployments.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const sameOrigin = !!origin && !!req.headers.host && origin === `https://${req.headers.host}`;
  if (!origin || sameOrigin || origins.includes(origin)) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  }
  return res.status(403).json({ error: 'Origin not allowed by CORS' });
});
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'sdms-api' }));
app.use('/api', requireAuth);
app.use('/api/organizations', organizations);
app.use('/api/persons', persons);
app.use('/api/incidents', incidents);
app.use('/api/violations', violations);
app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed by CORS') return res.status(403).json({ error: err.message });
  console.error('Unhandled API error:', err?.message || 'unknown error');
  res.status(500).json({ error: 'Internal server error.' });
});
// On Vercel the Express app runs as a serverless function (api/index.js),
// so we only bind a local port when NOT running there.
const port = Number(process.env.PORT || 4000);
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`SDMS API listening on port ${port}`));
}

export default app;
