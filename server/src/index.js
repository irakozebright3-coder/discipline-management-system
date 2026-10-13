import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requireAuth } from './middleware/auth.js';
import persons from './routes/persons.js';
import incidents from './routes/incidents.js';

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
app.use('/api/persons', persons);
app.use('/api/incidents', incidents);
app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed by CORS') return res.status(403).json({ error: err.message });
  console.error('Unhandled API error:', err?.message || 'unknown error');
  res.status(500).json({ error: 'Internal server error.' });
});
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`SDMS API listening on port ${port}`));
