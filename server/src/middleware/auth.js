import { authVerifier, adminDb } from '../supabase.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing bearer access token.' });
  const { data, error } = await authVerifier.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired access token.' });
  req.user = data.user;
  next();
}
const WRITE_ROLES = new Set(['org_admin', 'teacher', 'staff', 'platform_owner']);
export async function requireOrganizationRole(req, res, next) {
  const organizationId = String(req.query.organization_id || req.body.organization_id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) {
    return res.status(400).json({ error: 'A valid organization_id UUID is required.' });
  }
  const { data: membership, error } = await adminDb.from('organization_members')
    .select('role').eq('organization_id', organizationId).eq('user_id', req.user.id).maybeSingle();
  if (error) return res.status(500).json({ error: 'Could not verify organization membership.' });
  if (!membership) return res.status(403).json({ error: 'You do not belong to this organization.' });
  req.organizationId = organizationId;
  req.organizationRole = membership.role;
  next();
}
export function requireWriteRole(req, res, next) {
  if (!WRITE_ROLES.has(req.organizationRole)) return res.status(403).json({ error: 'Your role cannot create or modify records.' });
  next();
}
const ADMIN_ROLES = new Set(['org_admin', 'platform_owner']);
export function requireAdminRole(req, res, next) {
  if (!ADMIN_ROLES.has(req.organizationRole)) return res.status(403).json({ error: 'Only organization admins can perform this action.' });
  next();
}
