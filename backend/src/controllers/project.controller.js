import Project from '../models/Project.model.js';
import Task from '../models/Task.model.js';
import Workspace from '../models/Workspace.model.js';
import { logActivity } from '../utils/activityLog.utils.js';

// ── GET all projects in a workspace ───────────────────────────────────────────
export const getProjects = async (req, res, next) => {
  try {
    const { workspace } = req.query;
    if (!workspace) return res.status(400).json({ success: false, message: 'workspace query required' });

    const ws = await Workspace.findById(workspace);
    if (!ws || !ws.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const projects = await Project.find({ workspace, isArchived: false })
      .populate('owner', 'name avatar')
      .populate('members.user', 'name avatar')
      .lean({ virtuals: true })
      .sort('-createdAt');

    // Attach task counts
    const projectIds = projects.map(p => p._id);
    const taskCounts = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } },
    ]);

    const countsMap = {};
    taskCounts.forEach(({ _id, count }) => {
      if (!countsMap[_id.project]) countsMap[_id.project] = {};
      countsMap[_id.project][_id.status] = count;
    });

    const enriched = projects.map(p => ({
      ...p,
      taskCounts: countsMap[p._id] || {},
      totalTasks: Object.values(countsMap[p._id] || {}).reduce((a, b) => a + b, 0),
      completedTasks: countsMap[p._id]?.done || 0,
    }));

    res.json({ success: true, projects: enriched });
  } catch (err) { next(err); }
};

// ── GET single project ─────────────────────────────────────────────────────────
export const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar lastSeen');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!project.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, project });
  } catch (err) { next(err); }
};

// ── CREATE project ─────────────────────────────────────────────────────────────
export const createProject = async (req, res, next) => {
  try {
    const { name, description, workspace, dueDate, color, priority } = req.body;

    const ws = await Workspace.findById(workspace);
    if (!ws || !ws.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const project = await Project.create({
      name, description, workspace, dueDate, color, priority,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'project_manager' }],
    });

    logActivity({ actor: req.user._id, action: 'project_created', workspace, project: project._id,
      description: `Created project "${name}"` });

    const populated = await project.populate('owner', 'name avatar');
    res.status(201).json({ success: true, project: populated });
  } catch (err) { next(err); }
};

// ── UPDATE project ─────────────────────────────────────────────────────────────
export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!project.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const allowed = ['name', 'description', 'status', 'priority', 'dueDate', 'startDate', 'color', 'tags'];
    const changes = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined && project[f]?.toString() !== req.body[f]?.toString()) {
        changes[f] = { from: project[f], to: req.body[f] };
        project[f] = req.body[f];
      }
    });

    if (req.body.status === 'completed') project.completedAt = new Date();
    await project.save();

    logActivity({ actor: req.user._id, action: 'project_updated', project: project._id,
      workspace: project.workspace, description: `Updated project "${project.name}"`, changes });

    const updated = await Project.findById(project._id)
      .populate('owner', 'name avatar').populate('members.user', 'name avatar');
    res.json({ success: true, project: updated });
  } catch (err) { next(err); }
};

// ── DELETE project ─────────────────────────────────────────────────────────────
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ success: false, message: 'Only the project owner can delete it' });

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
};

// ── GET project stats ─────────────────────────────────────────────────────────
export const getProjectStats = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || !project.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [statusBreakdown, priorityBreakdown, assigneeBreakdown, recentActivity] = await Promise.all([
      Task.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: { project: project._id, assignees: { $exists: true, $ne: [] } } },
        { $unwind: '$assignees' },
        { $group: { _id: '$assignees', taskCount: { $sum: 1 }, completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
        }}},
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { 'user.name': 1, 'user.avatar': 1, taskCount: 1, completedCount: 1 } },
      ]),
      Task.find({ project: project._id }).sort('-updatedAt').limit(5)
        .select('title status updatedAt').lean(),
    ]);

    // Build completion over time (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const completionTimeline = await Task.aggregate([
      { $match: { project: project._id, completedAt: { $gte: sevenDaysAgo }, status: 'done' } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      stats: { statusBreakdown, priorityBreakdown, assigneeBreakdown, completionTimeline, recentActivity },
    });
  } catch (err) { next(err); }
};
