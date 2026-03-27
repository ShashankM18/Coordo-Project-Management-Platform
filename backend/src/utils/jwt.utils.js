import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

// Generate a cryptographically secure random token (for password reset, invites)
export const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

// Hash a plain token before storing in DB (never store plain tokens)
export const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// Build token pair + expiry info
export const createTokenPair = (userId, role) => {
  const payload = { id: userId, role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};
