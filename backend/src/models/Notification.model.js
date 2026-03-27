import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      required: true,
      enum: [
        'task_assigned',
        'task_unassigned',
        'task_completed',
        'task_commented',
        'task_due_soon',
        'task_overdue',
        'project_invited',
        'workspace_invited',
        'workspace_role_changed',
        'project_status_changed',
        'mention',
        'file_uploaded',
        'ai_analysis_ready',
        'meeting_scheduled',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: Date,

    // Context links for navigation
    link: String,
    metadata: {
      taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
      commentId: { type: mongoose.Schema.Types.ObjectId },
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
      workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
      channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
      wikiPageId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiPage' },
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // auto-delete after 30 days

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
