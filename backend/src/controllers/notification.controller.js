import Notification from '../models/Notification.model.js';

// GET /api/notifications
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name avatar')
      .sort('-createdAt')
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ success: true, notifications, unreadCount });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/:id/read
export const markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/read-all
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    res.json({ success: true });
  } catch (err) { next(err); }
};
