import { adminDb, authVerifier } from '../supabase.js';

// ---- role matrix (least privilege) ----
export const ROLES = {
  platform_owner: { write: true, report: true, decide: true, admin: true, manage_users: true, read_only: false },
  institution_admin: { write: true, report: true, decide: true, admin: true, manage_users: true, read_only: false },
  disciplinary_officer: { write: true, report: true, decide: false, admin: false, manage_users: false, read_only: false },
  reviewer: { write: false, report: false, decide: false, admin: false, manage_users: false, read_only: false },
  // Staff submit incident reports; they cannot edit people, settings or structure.
  staff: { write: false, report: true, decide: false, admin: false, manage_users: false, read_only: false },
  auditor: { write: false, report: false, decide: false, admin: false, manage_users: false, read_only: true }
};

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  const { data, error } = await authVerifier.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  req.user = { id: data.user.id, email: data.user.email, full_name: data.user.user_metadata?.full_name || data.user.email };
  req.token = token;
  next();
}

// Resolves the caller's effective role in an institution (null if not a member).
export async function resolveMembership(userId, institutionId) {
  const { data: member } = await adminDb.from('institution_memberships')
    .select('role, status').eq('institution_id', institutionId).eq('user_id', userId).maybeSingle();
  let role = member?.status === 'active' ? member.role : null;
  // Platform owners have full access to every institution.
  if (!role) {
    const { data: settings } = await adminDb.from('platform_settings').select('app_settings').eq('id', 1).maybeSingle();
    const owners = settings?.app_settings?.owner_ids || [];
    if (owners.includes(userId)) role = 'platform_owner';
  }
  return role;
}

// Loads the user's membership for req.params/query/body institution and enforces allowed roles.
// Usage: requireMembership(...roles) — empty roles = any member.
export function requireMembership(...allowed) {
  return async (req, res, next) => {
    const institutionId = req.params.institutionId || req.query.institution_id || req.body?.institution_id;
    if (!institutionId) return res.status(400).json({ error: 'An institution is required.' });
    req.institutionId = institutionId;
    const role = await resolveMembership(req.user.id, institutionId);
    if (!role) return res.status(403).json({ error: 'You do not have access to this institution.' });
    req.role = role;
    if (allowed.length > 0 && !allowed.includes(role)) {
      return res.status(403).json({ error: 'Your role does not allow this action.' });
    }
    next();
  };
}

// Case-scoped middleware for /:id routes: derives the institution from the case
// itself so the client can never spoof scope, then enforces membership.
export function requireCase(...allowed) {
  return async (req, res, next) => {
    const { data: incident } = await adminDb.from('incidents')
      .select('*, people(full_name, person_id)').eq('id', req.params.id).maybeSingle();
    if (!incident) return res.status(404).json({ error: 'Case not found in this institution.' });
    req.institutionId = incident.institution_id;
    req.incident = incident;
    const role = await resolveMembership(req.user.id, incident.institution_id);
    if (!role) return res.status(403).json({ error: 'You do not have access to this institution.' });
    req.role = role;
    if (allowed.length > 0 && !allowed.includes(role)) {
      return res.status(403).json({ error: 'Your role does not allow this action.' });
    }
    next();
  };
}

export function canWrite(role) { return ROLES[role]?.write === true; }
export function canReport(role) { return ROLES[role]?.report === true; }
export function canDecide(role) { return ROLES[role]?.decide || false; }
export function isAdmin(role) { return role === 'institution_admin' || role === 'platform_owner'; }
export function isReadOnly(role) { return ROLES[role]?.read_only === true; }
export async function isPlatformOwner(userId) {
  const { data: settings } = await adminDb.from('platform_settings').select('app_settings').eq('id', 1).maybeSingle();
  return (settings?.app_settings?.owner_ids || []).includes(userId);
}
export async function requirePlatformOwner(req, res, next) {
  if (await isPlatformOwner(req.user.id)) return next();
  return res.status(403).json({ error: 'Platform owner access required.' });
}
