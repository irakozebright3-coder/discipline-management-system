import { adminDb } from './supabase.js';

export async function audit(institutionId, userId, userName, action, entityType, entityId, details) {
  try {
    await adminDb.from('audit_logs').insert({
      institution_id: institutionId || null, actor_id: userId || null, actor_name: userName || null,
      action, entity_type: entityType, entity_id: entityId ? String(entityId) : null,
      details: details || {}
    });
  } catch (e) { console.error('audit insert failed:', e.message); }
}

export async function platformAudit(action, target, details, userName, userId) {
  try {
    await adminDb.from('platform_audit_logs').insert({
      action, target: target || 'platform', details: String(details || ''),
      user_name: userName || 'system', actor_id: userId || null, result: 'Success'
    });
  } catch (e) { console.error('platform audit failed:', e.message); }
}

export async function notify(userIds, institutionId, type, title, body, link) {
  if (!userIds?.length) return;
  try {
    await adminDb.from('notifications').insert(userIds.map(uid => ({
      user_id: uid, institution_id: institutionId || null, type, title,
      body: body || '', link: link || null
    })));
  } catch (e) { console.error('notify failed:', e.message); }
}

// Atomic per-institution case number: DM-<year>-<seq>
export async function nextCaseNumber(institutionId) {
  const year = new Date().getFullYear();
  const { data: counter, error } = await adminDb.rpc('increment_case_counter', { inst: institutionId });
  if (error || counter === null || counter === undefined) {
    // fallback: initialize then retry once
    await adminDb.from('case_counters').insert({ institution_id: institutionId }).upsert({ institution_id: institutionId });
    const retry = await adminDb.rpc('increment_case_counter', { inst: institutionId });
    if (retry.error) throw new Error('Could not allocate a case number.');
    return `DM-${year}-${String(retry.data).padStart(5, '0')}`;
  }
  return `DM-${year}-${String(counter).padStart(5, '0')}`;
}

export const csvEscape = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return `"${s.replace(/"/g, '""')}"`;
};

export const toCsv = (headers, rows) => {
  const lines = [headers.map(csvEscape).join(',')];
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  return lines.join('\r\n');
};

export function zodMessage(err, fallback) {
  const fe = err?.flatten?.()?.fieldErrors || {};
  const first = Object.entries(fe)[0];
  if (first) return `${first[0]}: ${first[1][0]}`;
  return fallback || 'Invalid data.';
}

// Paginated auth user directory (capped) for admin screens and invitations.
export async function listUserDirectory(maxPages = 5) {
  const byId = {}, byEmail = {};
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await adminDb.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      const entry = { id: u.id, email: u.email, full_name: u.user_metadata?.full_name || null, created_at: u.created_at };
      byId[u.id] = entry;
      if (u.email) byEmail[u.email.toLowerCase()] = entry;
    }
    if (data.users.length < 200) break;
  }
  return { byId, byEmail };
}
