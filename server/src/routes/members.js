import { Router } from 'express';
import { z } from 'zod';
import { adminDb } from '../supabase.js';
import { requireAuth, requireMembership, isAdmin, isPlatformOwner } from '../middleware/auth.js';
import { audit, notify, zodMessage, listUserDirectory } from '../lib.js';

const router = Router();
const ASSIGNABLE = ['institution_admin', 'disciplinary_officer', 'reviewer', 'staff', 'auditor'];

// Members + pending invitations for an institution.
router.get('/:institutionId/members', requireAuth, requireMembership(), async (req, res) => {
  const [members, invites, users] = await Promise.all([
    adminDb.from('institution_memberships').select('id, user_id, role, status, created_at').eq('institution_id', req.institutionId).order('created_at'),
    adminDb.from('invitations').select('id, email, role, status, expires_at, created_at').eq('institution_id', req.institutionId).order('created_at'),
    listUserDirectory(5)
  ]);
  const rows = (members.data || []).map(m => ({
    ...m,
    email: users.byId[m.user_id]?.email || null,
    full_name: users.byId[m.user_id]?.full_name || null
  }));
  const invitations = (invites.data || []).map(i => ({ ...i, full_name: users.byEmail[i.email]?.full_name || null }));
  res.json({ data: { members: rows, invitations } });
});

// Invite a user by email with a role. No email provider is configured, so the
// caller receives an invite link to share; the invite also activates automatically
// when that person signs up with the same email.
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ASSIGNABLE)
});

router.post('/:institutionId/members/invite', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid invitation.') });
  const { email, role } = parsed.data;
  const normalized = email.toLowerCase().trim();

  // If the person already has an account, add the membership directly.
  const directory = await listUserDirectory(5);
  const found = directory.byEmail[normalized];
  if (found) {
    const { data: existing } = await adminDb.from('institution_memberships')
      .select('id').eq('institution_id', req.institutionId).eq('user_id', found.id).maybeSingle();
    if (existing) return res.status(409).json({ error: 'This person is already a member.' });
    await adminDb.from('institution_memberships').insert({ institution_id: req.institutionId, user_id: found.id, role, status: 'active', invited_by: req.user.id });
    await notify([found.id], req.institutionId, 'membership', 'You were added to an institution', `You were added with the ${role} role.`, '/dashboard');
    await audit(req.institutionId, req.user.id, req.user.full_name, 'member.add', 'membership', found.id, { email: normalized, role });
    return res.status(201).json({ data: { added_directly: true, email: normalized, role } });
  }

  const { data: invite, error } = await adminDb.from('invitations')
    .upsert({ institution_id: req.institutionId, email: normalized, role, created_by: req.user.id, status: 'pending' },
            { onConflict: 'institution_id,email' })
    .select().single();
  if (error) return res.status(400).json({ error: 'Could not create the invitation.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'member.invite', 'invitation', invite.id, { email: normalized, role });
  res.status(201).json({ data: { invitation: invite, invite_link: `/invite/${invite.token}` } });
});

const memberPatchSchema = z.object({
  role: z.enum(ASSIGNABLE).optional(),
  status: z.enum(['active', 'suspended']).optional()
});

router.patch('/:institutionId/members/:membershipId', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const parsed = memberPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: zodMessage(parsed.error, 'Invalid member update.') });
  const { data: member } = await adminDb.from('institution_memberships')
    .select('id, user_id, role').eq('id', req.params.membershipId).eq('institution_id', req.institutionId).maybeSingle();
  if (!member) return res.status(404).json({ error: 'Member not found in this institution.' });
  if (member.user_id === req.user.id && parsed.data.role && parsed.data.role !== 'institution_admin') {
    return res.status(400).json({ error: 'You cannot demote yourself. Ask another admin.' });
  }
  const { data, error } = await adminDb.from('institution_memberships').update(parsed.data).eq('id', member.id).select().single();
  if (error) return res.status(400).json({ error: 'Could not update the member.' });
  await audit(req.institutionId, req.user.id, req.user.full_name, 'member.update', 'membership', member.id, parsed.data);
  if (parsed.data.role) await notify([member.user_id], req.institutionId, 'membership', 'Your role was updated', `Your role is now ${parsed.data.role}.`, '/dashboard');
  res.json({ data });
});

router.delete('/:institutionId/members/:membershipId', requireAuth, requireMembership('institution_admin', 'platform_owner'), async (req, res) => {
  const { data: member } = await adminDb.from('institution_memberships')
    .select('id, user_id').eq('id', req.params.membershipId).eq('institution_id', req.institutionId).maybeSingle();
  if (!member) return res.status(404).json({ error: 'Member not found.' });
  if (member.user_id === req.user.id) return res.status(400).json({ error: 'You cannot remove yourself. Ask another admin.' });
  await adminDb.from('institution_memberships').delete().eq('id', member.id);
  await audit(req.institutionId, req.user.id, req.user.full_name, 'member.remove', 'membership', member.id, { user_id: member.user_id });
  res.json({ data: { removed: true } });
});

// Accept an invitation (authenticated user whose email matches).
router.post('/invitations/accept', requireAuth, async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'An invitation token is required.' });
  const { data: invite } = await adminDb.from('invitations').select('*').eq('token', token).maybeSingle();
  if (!invite) return res.status(404).json({ error: 'This invitation does not exist.' });
  if (invite.status !== 'pending') return res.status(400).json({ error: `This invitation is ${invite.status}.` });
  if (new Date(invite.expires_at) < new Date()) return res.status(400).json({ error: 'This invitation has expired.' });
  if (invite.email.toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(403).json({ error: 'This invitation was sent to a different email address.' });
  }
  const { data: existing } = await adminDb.from('institution_memberships')
    .select('id').eq('institution_id', invite.institution_id).eq('user_id', req.user.id).maybeSingle();
  if (existing) {
    await adminDb.from('invitations').update({ status: 'accepted', accepted_by: req.user.id }).eq('id', invite.id);
    return res.json({ data: { already_member: true } });
  }
  await adminDb.from('institution_memberships').insert({
    institution_id: invite.institution_id, user_id: req.user.id, role: invite.role, status: 'active', invited_by: invite.created_by
  });
  await adminDb.from('invitations').update({ status: 'accepted', accepted_by: req.user.id }).eq('id', invite.id);
  await audit(invite.institution_id, req.user.id, req.user.full_name, 'invitation.accept', 'invitation', invite.id, {});
  const { data: admins } = await adminDb.from('institution_memberships').select('user_id')
    .eq('institution_id', invite.institution_id).eq('role', 'institution_admin');
  await notify((admins || []).map(a => a.user_id), invite.institution_id, 'invitation', 'A member joined', `${req.user.email} accepted their invitation.`, '/settings/users');
  res.json({ data: { institution_id: invite.institution_id, role: invite.role } });
});

// Check pending invitation for an email at sign-in.
router.post('/invitations/lookup', requireAuth, async (req, res) => {
  const { data: invites } = await adminDb.from('invitations')
    .select('token, institution_id, role, expires_at, institutions(name)')
    .eq('email', (req.user.email || '').toLowerCase()).eq('status', 'pending');
  const valid = (invites || []).filter(i => new Date(i.expires_at) > new Date());
  res.json({ data: valid });
});

export default router;
