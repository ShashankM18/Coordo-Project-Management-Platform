import ActivityLog from '../models/ActivityLog.model.js';

/**
 * Log an activity.
 * Call this fire-and-forget — never await it in route handlers.
 */
export const logActivity = ({
  actor,
  action,
  description,
  workspace,
  project,
  task,
  changes,
  metadata,
  ipAddress,
}) => {
  ActivityLog.create({
    actor,
    action,
    description,
    workspace,
    project,
    task,
    changes,
    metadata,
    ipAddress,
  }).catch((err) => console.error('ActivityLog error:', err.message));
};
