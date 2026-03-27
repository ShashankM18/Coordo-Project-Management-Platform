import User from '../models/User.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import fs from 'fs';

// GET /api/users/me — already handled by auth/me, this is for profile page
export const getMyProfile = async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
};

// PATCH /api/users/me
export const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'notificationPreferences'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/me/avatar
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Delete old avatar from Cloudinary
    if (req.user.avatarPublicId) {
      await deleteFromCloudinary(req.user.avatarPublicId).catch(() => {});
    }

    const { url, publicId } = await uploadToCloudinary(req.file.path, 'coordo/avatars');

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: url, avatarPublicId: publicId },
      { new: true }
    );

    res.json({ success: true, avatarUrl: url, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/search?q=john
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
      isActive: true,
    })
      .select('name email avatar avatarUrl')
      .limit(10);

    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};
