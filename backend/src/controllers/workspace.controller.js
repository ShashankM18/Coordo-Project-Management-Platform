import crypto from 'crypto';
import Workspace from '../models/Workspace.model.js';
import User from '../models/User.model.js';
import Project from '../models/Project.model.js';
import { sendWorkspaceInviteEmail } from '../utils/email.utils.js';
import { logActivity } from '../utils/activityLog.utils.js';
import slugify from 'slugify';

// ── GET all workspaces for current user ────────────────────────────────────────
export const getMyWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user._id,
      isActive: true,
    }).populate('owner', 'name email avatar').lean({ virtuals: true });

    res.json({ success: true, workspaces });
  } catch (err) { next(err); }
};

// ── GET single workspace ───────────────────────────────────────────────────────
export const getWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar lastSeen');

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, workspace });
  } catch (err) { next(err); }
};

// ── CREATE workspace ───────────────────────────────────────────────────────────
export const createWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // Generate unique slug
    let slug = slugify(name, { lower: true, strict: true });
    const existing = await Workspace.countDocuments({ slug: new RegExp(`^${slug}`) });
    if (existing) slug = `${slug}-${existing}`;

    const workspace = await Workspace.create({
      name,
      description,
      slug,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });

    logActivity({ actor: req.user._id, action: 'workspace_created', workspace: workspace._id,
      description: `Created workspace "${name}"` });

    res.status(201).json({ success: true, workspace });
  } catch (err) { next(err); }
};

// ── UPDATE workspace ───────────────────────────────────────────────────────────
export const updateWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (!workspace.isAdmin(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const allowed = ['name', 'description', 'settings'];
    allowed.forEach(f => { if (req.body[f] !== undefined) workspace[f] = req.body[f]; });
    await workspace.save();

    res.json({ success: true, workspace });
  } catch (err) { next(err); }
};

// ── INVITE member by email ─────────────────────────────────────────────────────
export const inviteMember = async (req, res, next) => {
  try {
    const { email, role = 'member' } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (!workspace.isAdmin(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Check if user already a member
    const existingUser = await User.findOne({ email });
    if (existingUser && workspace.isMember(existingUser._id)) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }

    // Check for existing pending invite
    const alreadyInvited = workspace.pendingInvites.some(
      i => i.email === email.toLowerCase() && i.expiresAt > new Date()
    );
    if (alreadyInvited) {
      return res.status(400).json({ success: false, message: 'Invite already sent to this email' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    workspace.pendingInvites.push({ email: email.toLowerCase(), token, role, expiresAt, invitedBy: req.user._id });
    await workspace.save();

    // Use req.headers.origin if available to dynamically get the deployed frontend URL, 
    // otherwise fallback to the .env CLIENT_URL
    const clientUrl = req.headers.origin || process.env.CLIENT_URL;
    const inviteUrl = `${clientUrl}/invite/${token}`;
    
    // TEMPORARY: Print the invite link to the backend console so you can click it
    // since emails won't send without correct SMTP settings in the .env file
    console.log(`\n=== INVITE LINK FOR ${email} ===\n${inviteUrl}\n=================================\n`);
    
    try {
      await sendWorkspaceInviteEmail({
        to: email, inviterName: req.user.name, workspaceName: workspace.name, inviteUrl
      });
    } catch (emailError) {
      console.error('❌ Failed to send invite email:', emailError);
      // We will still proceed, but the admin will see this in the server logs
    }

    logActivity({ actor: req.user._id, action: 'workspace_member_invited', workspace: workspace._id,
      description: `Invited ${email} to workspace` });

    res.json({ success: true, message: `Invite sent to ${email}` });
  } catch (err) { next(err); }
};

// ── ACCEPT invite ──────────────────────────────────────────────────────────────
export const acceptInvite = async (req, res, next) => {
  try {
    const { token } = req.body;
    const workspace = await Workspace.findOne({
      'pendingInvites.token': token,
      'pendingInvites.expiresAt': { $gt: new Date() },
    });

    if (!workspace) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invite link' });
    }

    const invite = workspace.pendingInvites.find(i => i.token === token);

    // Add member
    if (!workspace.isMember(req.user._id)) {
      workspace.members.push({ user: req.user._id, role: invite.role });
    }
    // Remove used invite
    workspace.pendingInvites = workspace.pendingInvites.filter(i => i.token !== token);
    await workspace.save();

    logActivity({ actor: req.user._id, action: 'workspace_member_joined', workspace: workspace._id,
      description: `${req.user.name} joined workspace` });

    res.json({ success: true, message: 'You joined the workspace!', workspace });
  } catch (err) { next(err); }
};

// ── UPDATE member role ────────────────────────────────────────────────────────
export const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (!workspace.isAdmin(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const member = workspace.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    member.role = role;
    await workspace.save();
    res.json({ success: true, message: 'Role updated' });
  } catch (err) { next(err); }
};

// ── REMOVE member ─────────────────────────────────────────────────────────────
export const removeMember = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });

    const isSelf = req.params.userId === req.user._id.toString();
    if (!isSelf && !workspace.isAdmin(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    workspace.members = workspace.members.filter(m => m.user.toString() !== req.params.userId);
    await workspace.save();
    res.json({ success: true, message: 'Member removed' });
  } catch (err) { next(err); }
};
