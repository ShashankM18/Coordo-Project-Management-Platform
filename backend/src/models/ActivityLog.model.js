import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Task actions
        'task_created', 'task_updated', 'task_deleted',
        'task_status_changed', 'task_assigned', 'task_unassigned',
        'task_commented', 'task_file_attached', 'task_due_date_changed',
        // Project actions
        'project_created', 'project_updated', 'project_deleted',
        'project_status_changed', 'project_member_added', 'project_member_removed',
        // Workspace actions
        'workspace_created', 'workspace_updated',
        'workspace_member_invited', 'workspace_member_joined', 'workspace_member_removed',
        'workspace_role_changed',
        // File actions
        'file_uploaded', 'file_deleted',
      ],
    },
    description: { type: String, required: true },
    // Snapshot of what changed: { field: { from, to } }
    changes: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ workspace: 1, createdAt: -1 });
activityLogSchema.index({ project: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });
// Auto-delete after 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
