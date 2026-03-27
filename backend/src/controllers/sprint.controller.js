import Sprint from '../models/Sprint.model.js';
import Project from '../models/Project.model.js';
import Task from '../models/Task.model.js';

const ensureProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { ok: false, status: 404, message: 'Project not found' };
  if (!project.isMember(userId)) return { ok: false, status: 403, message: 'Access denied' };
  return { ok: true, project };
};

export const listSprints = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ success: false, message: 'projectId query required' });

    const access = await ensureProjectAccess(projectId, req.user._id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    const sprints = await Sprint.find({ projectId }).sort('-startDate');
    res.json({ success: true, sprints });
  } catch (err) { next(err); }
};

export const createSprint = async (req, res, next) => {
  try {
    const { name, startDate, endDate, projectId, taskIds = [] } = req.body;
    if (!name?.trim() || !projectId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'name, startDate, endDate and projectId are required' });
    }

    const access = await ensureProjectAccess(projectId, req.user._id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'startDate cannot be after endDate' });
    }

    const validTasks = await Task.countDocuments({
      _id: { $in: taskIds },
      project: projectId,
      status: { $ne: 'done' },
    });

    if (validTasks !== taskIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Sprint tasks must belong to the same project and cannot include tasks in Done',
      });
    }

    const sprint = await Sprint.create({
      name: name.trim(),
      startDate,
      endDate,
      projectId,
      workspaceId: access.project.workspace,
      taskIds,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, sprint });
  } catch (err) { next(err); }
};

export const updateSprint = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });

    const access = await ensureProjectAccess(sprint.projectId, req.user._id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    if (req.body.name !== undefined) sprint.name = req.body.name;
    if (req.body.startDate !== undefined) sprint.startDate = req.body.startDate;
    if (req.body.endDate !== undefined) sprint.endDate = req.body.endDate;
    if (req.body.taskIds !== undefined) {
      const validTasks = await Task.countDocuments({
        _id: { $in: req.body.taskIds },
        project: sprint.projectId,
        status: { $ne: 'done' },
      });
      if (validTasks !== req.body.taskIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Sprint tasks must belong to the same project and cannot include tasks in Done',
        });
      }
      sprint.taskIds = req.body.taskIds;
    }

    if (new Date(sprint.startDate) > new Date(sprint.endDate)) {
      return res.status(400).json({ success: false, message: 'startDate cannot be after endDate' });
    }

    await sprint.save();
    res.json({ success: true, sprint });
  } catch (err) { next(err); }
};

export const deleteSprint = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });

    const access = await ensureProjectAccess(sprint.projectId, req.user._id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    await sprint.deleteOne();
    res.json({ success: true, message: 'Sprint deleted' });
  } catch (err) { next(err); }
};
