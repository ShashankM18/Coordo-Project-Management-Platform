import { verifyAccessToken } from '../utils/jwt.utils.js';
import User from '../models/User.model.js';

// ── Protect: verify JWT + attach user ────────────────────────────────────────
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select('-password -refreshTokens');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    req.user = user;

    // Update lastSeen (fire and forget)
    User.findByIdAndUpdate(decoded.id, { lastSeen: new Date() }).exec();

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ── Role guard: restrict to certain system roles ──────────────────────────────
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}`,
    });
  }
  next();
};

// ── Workspace role guard ──────────────────────────────────────────────────────
// Attaches req.workspaceMemberRole after protect middleware
export const requireWorkspaceRole = (...roles) => async (req, res, next) => {
  const { workspace } = req; // must be set by the route handler before this
  if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });

  const role = workspace.getMemberRole(req.user._id);
  const isOwner = workspace.owner.toString() === req.user._id.toString();

  if (!isOwner && !roles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: `Workspace role required: ${roles.join(' or ')}`,
    });
  }

  req.workspaceMemberRole = isOwner ? 'owner' : role;
  next();
};

// ── Optional auth: attach user if token exists, but don't fail ────────────────
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      req.user = await User.findById(decoded.id).select('-password -refreshTokens');
    }
  } catch { /* no-op */ }
  next();
};
