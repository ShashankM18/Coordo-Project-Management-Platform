import User from '../models/User.model.js';
import {
  createTokenPair,
  verifyRefreshToken,
  generateSecureToken,
  hashToken,
} from '../utils/jwt.utils.js';
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '../utils/email.utils.js';

// ── Register ──────────────────────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const { accessToken, refreshToken } = createTokenPair(user._id, user.role);

    // Store hashed refresh token
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: hashToken(refreshToken) },
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const { accessToken, refreshToken } = createTokenPair(user._id, user.role);

    // Keep max 5 refresh tokens (trim oldest if needed)
    const tokens = user.refreshTokens || [];
    if (tokens.length >= 5) tokens.shift();
    tokens.push(hashToken(refreshToken));

    await User.findByIdAndUpdate(user._id, {
      refreshTokens: tokens,
      lastSeen: new Date(),
    });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const hashedIncoming = hashToken(refreshToken);

    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user || !user.refreshTokens?.includes(hashedIncoming)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Rotate: remove old, add new
    const { accessToken, refreshToken: newRefreshToken } = createTokenPair(user._id, user.role);
    const updatedTokens = user.refreshTokens
      .filter((t) => t !== hashedIncoming)
      .concat(hashToken(newRefreshToken));

    await User.findByIdAndUpdate(user._id, { refreshTokens: updatedTokens });

    res.json({ success: true, accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const hashed = hashToken(refreshToken);
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: hashed },
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Get current user ──────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
};

// ── Forgot Password ───────────────────────────────────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
    }

    const rawToken = generateSecureToken();
    const hashedToken = hashToken(rawToken);

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user, resetUrl);

    res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    next(err);
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+refreshTokens');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset token is invalid or has expired' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // invalidate all sessions
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
};
