import { supabase } from './supabase.js';

// Leave VITE_API_BASE_URL empty in production to use the same origin (Vercel hosts the API too).
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
export async function apiRequest(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before continuing.');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}
export const listOrganizations = () => apiRequest('/api/organizations');
export const listPersons = (organizationId) => apiRequest(`/api/persons?organization_id=${encodeURIComponent(organizationId)}`);
export const createPerson = (person) => apiRequest('/api/persons', { method: 'POST', body: JSON.stringify(person) });
export const getPerson = (id, organizationId) => apiRequest(`/api/persons/${id}?organization_id=${encodeURIComponent(organizationId)}`);
export const updatePerson = (id, changes, organizationId) => apiRequest(`/api/persons/${id}?organization_id=${encodeURIComponent(organizationId)}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const deletePerson = (id, organizationId) => apiRequest(`/api/persons/${id}?organization_id=${encodeURIComponent(organizationId)}`, { method: 'DELETE' });
export const listIncidents = (organizationId) => apiRequest(`/api/incidents?organization_id=${encodeURIComponent(organizationId)}`);
export const createIncident = (incident) => apiRequest('/api/incidents', { method: 'POST', body: JSON.stringify(incident) });
export const getIncident = (id, organizationId) => apiRequest(`/api/incidents/${id}?organization_id=${encodeURIComponent(organizationId)}`);
export const updateIncident = (id, changes, organizationId) => apiRequest(`/api/incidents/${id}?organization_id=${encodeURIComponent(organizationId)}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const deleteIncident = (id, organizationId) => apiRequest(`/api/incidents/${id}?organization_id=${encodeURIComponent(organizationId)}`, { method: 'DELETE' });
export const listViolations = (organizationId) => apiRequest(`/api/violations?organization_id=${encodeURIComponent(organizationId)}`);
export const createViolation = (violation) => apiRequest('/api/violations', { method: 'POST', body: JSON.stringify(violation) });
export const updateViolation = (id, changes, organizationId) => apiRequest(`/api/violations/${id}?organization_id=${encodeURIComponent(organizationId)}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const deleteViolation = (id, organizationId) => apiRequest(`/api/violations/${id}?organization_id=${encodeURIComponent(organizationId)}`, { method: 'DELETE' });

// ---------- Organization setup ----------
export const setupOrganization = (name, track) => apiRequest('/api/organizations', { method: 'POST', body: JSON.stringify({ name, track }) });

// ---------- Structure nodes ----------
export const listStructureNodes = (organizationId) => apiRequest(`/api/structure?organization_id=${encodeURIComponent(organizationId)}`);
export const createStructureNode = (node) => apiRequest('/api/structure', { method: 'POST', body: JSON.stringify(node) });
export const updateStructureNode = (id, changes, organizationId) => apiRequest(`/api/structure/${id}?organization_id=${encodeURIComponent(organizationId)}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const deleteStructureNode = (id, organizationId) => apiRequest(`/api/structure/${id}?organization_id=${encodeURIComponent(organizationId)}`, { method: 'DELETE' });

// ---------- Audit logs ----------
export const listAuditLogs = (organizationId) => apiRequest(`/api/audit-logs?organization_id=${encodeURIComponent(organizationId)}`);

// ---------- Platform owner console ----------
export const platformGet = (path) => apiRequest(`/api/platform/${path}`);
export const platformPost = (path, body) => apiRequest(`/api/platform/${path}`, { method: 'POST', body: JSON.stringify(body || {}) });
export const platformPatch = (path, body) => apiRequest(`/api/platform/${path}`, { method: 'PATCH', body: JSON.stringify(body) });
export const platformDelete = (path) => apiRequest(`/api/platform/${path}`, { method: 'DELETE' });

// ---------- Public content (no sign-in needed) ----------
async function publicRequest(path) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  const response = await fetch(`${baseUrl}/api/public${path}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}
export const getCommunityStats = () => publicRequest('/community-stats');
export const getContributors = () => publicRequest('/contributors');
export const getCreatorProfile = () => publicRequest('/creator-profile');
export const getHelpArticles = () => publicRequest('/help-articles');
export const getSubscriptionPlans = () => publicRequest('/subscription-plans');
