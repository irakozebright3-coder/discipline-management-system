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
const qs = (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
};
export { baseUrl };

// ---------- Institutions (multi-institution members) ----------
export const listInstitutions = () => apiRequest('/api/institutions');
export const createInstitution = (payload) => apiRequest('/api/institutions', { method: 'POST', body: JSON.stringify(payload) });
export const getInstitution = (id) => apiRequest(`/api/institutions/${id}`);
export const updateInstitution = (id, changes) => apiRequest(`/api/institutions/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const getInstitutionSettings = (id) => apiRequest(`/api/institutions/${id}/settings`);
export const updateInstitutionSettings = (id, changes) => apiRequest(`/api/institutions/${id}/settings`, { method: 'PATCH', body: JSON.stringify(changes) });

// ---------- People ----------
export const listPeople = (institutionId, params) => apiRequest(`/api/people${qs({ institution_id: institutionId, ...params })}`);
export const createPerson = (person) => apiRequest('/api/people', { method: 'POST', body: JSON.stringify(person) });
export const getPerson = (id, institutionId) => apiRequest(`/api/people/${id}${qs({ institution_id: institutionId })}`);
export const updatePerson = (id, changes, institutionId) => apiRequest(`/api/people/${id}`, { method: 'PATCH', body: JSON.stringify({ ...changes, institution_id: institutionId }) });
export const deletePerson = (id, institutionId) => apiRequest(`/api/people/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ institution_id: institutionId }) });

// ---------- Cases (incidents) ----------
export const listIncidents = (institutionId, params) => apiRequest(`/api/incidents${qs({ institution_id: institutionId, ...params })}`);
export const createIncident = (incident) => apiRequest('/api/incidents', { method: 'POST', body: JSON.stringify(incident) });
export const getIncident = (id) => apiRequest(`/api/incidents/${id}`);
export const updateIncident = (id, changes) => apiRequest(`/api/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const deleteIncident = (id) => apiRequest(`/api/incidents/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
export const assignCase = (id, payload) => apiRequest(`/api/incidents/${id}/assign`, { method: 'POST', body: JSON.stringify(payload) });
export const addCaseReview = (id, payload) => apiRequest(`/api/incidents/${id}/reviews`, { method: 'POST', body: JSON.stringify(payload) });
export const decideCase = (id, payload) => apiRequest(`/api/incidents/${id}/decision`, { method: 'POST', body: JSON.stringify(payload) });
export const addCaseAppeal = (id, payload) => apiRequest(`/api/incidents/${id}/appeals`, { method: 'POST', body: JSON.stringify(payload) });
export const resolveAppeal = (id, appealId, payload) => apiRequest(`/api/incidents/${id}/appeals/${appealId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const addCorrectiveAction = (id, payload) => apiRequest(`/api/incidents/${id}/corrective-actions`, { method: 'POST', body: JSON.stringify(payload) });
export const updateCorrectiveAction = (id, actionId, changes) => apiRequest(`/api/incidents/${id}/corrective-actions/${actionId}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const addFollowUp = (id, payload) => apiRequest(`/api/incidents/${id}/follow-ups`, { method: 'POST', body: JSON.stringify(payload) });
export const updateFollowUp = (id, taskId, changes) => apiRequest(`/api/incidents/${id}/follow-ups/${taskId}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const closeCase = (id) => apiRequest(`/api/incidents/${id}/close`, { method: 'POST', body: '{}' });
export const reopenCase = (id, reason) => apiRequest(`/api/incidents/${id}/reopen`, { method: 'POST', body: JSON.stringify({ reason }) });
export const uploadEvidence = (id, payload) => apiRequest(`/api/incidents/${id}/evidence`, { method: 'POST', body: JSON.stringify(payload) });
export const evidenceUrl = (id, evidenceId) => apiRequest(`/api/incidents/${id}/evidence/${evidenceId}/url`);
export const deleteEvidence = (id, evidenceId) => apiRequest(`/api/incidents/${id}/evidence/${evidenceId}`, { method: 'DELETE' });

// ---------- Categories ----------
export const listCategories = (institutionId, params) => apiRequest(`/api/categories${qs({ institution_id: institutionId, ...params })}`);
export const createCategory = (c) => apiRequest('/api/categories', { method: 'POST', body: JSON.stringify(c) });
export const updateCategory = (id, changes, institutionId) => apiRequest(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ ...changes, institution_id: institutionId }) });
export const deleteCategory = (id, institutionId) => apiRequest(`/api/categories/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ institution_id: institutionId }) });

// ---------- Structure ----------
export const listStructureNodes = (institutionId) => apiRequest(`/api/structure${qs({ institution_id: institutionId })}`);
export const createStructureNode = (node) => apiRequest('/api/structure', { method: 'POST', body: JSON.stringify(node) });
export const updateStructureNode = (id, changes, institutionId) => apiRequest(`/api/structure/${id}`, { method: 'PATCH', body: JSON.stringify({ ...changes, institution_id: institutionId }) });
export const deleteStructureNode = (id, institutionId) => apiRequest(`/api/structure/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ institution_id: institutionId }) });

// ---------- Scoring ----------
export const getPersonScores = (personId, institutionId) => apiRequest(`/api/scoring/person/${personId}${qs({ institution_id: institutionId })}`);
export const getScoringRules = (institutionId) => apiRequest(`/api/scoring/rules${qs({ institution_id: institutionId })}`);
export const adjustScore = (payload) => apiRequest('/api/scoring/adjust', { method: 'POST', body: JSON.stringify(payload) });
export const reverseScore = (transactionId, payload) => apiRequest(`/api/scoring/reverse/${transactionId}`, { method: 'POST', body: JSON.stringify(payload) });

// ---------- Members ----------
export const listMembers = (institutionId) => apiRequest(`/api/institutions/${institutionId}/members`);
export const inviteMember = (institutionId, payload) => apiRequest(`/api/institutions/${institutionId}/members/invite`, { method: 'POST', body: JSON.stringify(payload) });
export const updateMember = (institutionId, membershipId, changes) => apiRequest(`/api/institutions/${institutionId}/members/${membershipId}`, { method: 'PATCH', body: JSON.stringify(changes) });
export const removeMember = (institutionId, membershipId) => apiRequest(`/api/institutions/${institutionId}/members/${membershipId}`, { method: 'DELETE' });
export const acceptInvitation = (token) => apiRequest('/api/institutions/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) });

// ---------- History, dashboard, notifications, reports ----------
export const listAuditLogs = (institutionId, params) => apiRequest(`/api/audit-logs${qs({ institution_id: institutionId, ...params })}`);
export const getDashboard = (institutionId) => apiRequest(`/api/dashboard/${institutionId}`);
export const listNotifications = () => apiRequest('/api/notifications');
export const markNotificationsRead = (ids) => apiRequest('/api/notifications/read', { method: 'POST', body: JSON.stringify({ ids }) });
export const getReports = (institutionId, params) => apiRequest(`/api/reports${qs({ institution_id: institutionId, ...params })}`);
export const reportsExportUrl = (institutionId, params) => `${baseUrl}/api/reports/export.csv${qs({ institution_id: institutionId, ...params })}`;
export const scoresExportUrl = (institutionId, params) => `${baseUrl}/api/reports/scores.csv${qs({ institution_id: institutionId, ...params })}`;

// ---------- Profile ----------
export const getMyProfile = () => apiRequest('/api/profiles/me');
export const updateMyProfile = (changes) => apiRequest('/api/profiles/me', { method: 'PATCH', body: JSON.stringify(changes) });

// ---------- Platform owner console ----------
export const platformGet = (path) => apiRequest(`/api/platform/${path}`);
export const platformPost = (path, body) => apiRequest(`/api/platform/${path}`, { method: 'POST', body: JSON.stringify(body || {}) });
export const platformPatch = (path, body) => apiRequest(`/api/platform/${path}`, { method: 'PATCH', body: JSON.stringify(body) });
export const platformPut = (path, body) => apiRequest(`/api/platform/${path}`, { method: 'PUT', body: JSON.stringify(body) });
export const platformDelete = (path) => apiRequest(`/api/platform/${path}`, { method: 'DELETE' });

// ---------- Public content (no sign-in needed) ----------
async function publicRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}/api/public${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}
export const getCommunityStats = () => publicRequest('/stats');
export const getContributors = () => publicRequest('/contributors');
export const getCreatorProfile = () => publicRequest('/creator-profile');
export const getHelpArticles = () => publicRequest('/help-articles');
export const getFaqs = () => publicRequest('/faqs');
export const submitSupportRequest = (payload) => publicRequest('/support', {
  method: 'POST',
  body: JSON.stringify(payload)
});
export const getSubscriptionPlans = () => publicRequest('/subscription-plans');
