import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requireAuth } from './middleware/auth.js';
import persons from './routes/persons.js';
import incidents from './routes/incidents.js';
import violations from './routes/violations.js';
import organizations from './routes/organizations.js';

const app = express();
const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);
app.use(helmet());
app.use(cors({ origin(origin, callback) {
  if (!origin || origins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin not allowed by CORS'));
} }));
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
