import { supabase } from './supabase.js';

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
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
export const listPersons = (organizationId) => apiRequest(`/api/persons?organization_id=${encodeURIComponent(organizationId)}`);
export const createPerson = (person) => apiRequest('/api/persons', { method: 'POST', body: JSON.stringify(person) });
export const listIncidents = (organizationId) => apiRequest(`/api/incidents?organization_id=${encodeURIComponent(organizationId)}`);
export const createIncident = (incident) => apiRequest('/api/incidents', { method: 'POST', body: JSON.stringify(incident) });
