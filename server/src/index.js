import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import publicRoutes from './routes/public.js';
import institutions from './routes/institutions.js';
import members from './routes/members.js';
import people from './routes/people.js';
import structure from './routes/structure.js';
import categories from './routes/categories.js';
import incidents from './routes/incidents.js';
import scoring from './routes/scoring.js';
import notifications from './routes/notifications.js';
import auditRoutes from './routes/audit.js';
import reports from './routes/reports.js';
import profiles from './routes/profiles.js';
import dashboard from './routes/dashboard.js';
import platform from './routes/platform.js';
import { requireAuth } from './middleware/auth.js';
import { isPlatformOwner } from './middleware/auth.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '6mb' })); // base64 evidence uploads (4MB files ≈ 5.4MB encoded)

app.get('/health', (_req, res) => res.json({ ok: true, service: 'discipline-management-api' }));

app.use('/api/public', publicRoutes);

app.use('/api', requireAuth);
app.use('/api/institutions', institutions);
app.use('/api/institutions', members);
app.use('/api/profiles', profiles);
app.use('/api/notifications', notifications);
app.use('/api/people', people);
app.use('/api/structure', structure);
app.use('/api/categories', categories);
app.use('/api/incidents', incidents);
app.use('/api/scoring', scoring);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/reports', reports);
app.use('/api/dashboard', dashboard);
app.use('/api/platform', platform);

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err.message);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

const port = process.env.PORT || 3000;
if (process.env.VERCEL !== '1') {
  app.listen(port, () => console.log(`Discipline Management API listening on port ${port}`));
}
export default app;
