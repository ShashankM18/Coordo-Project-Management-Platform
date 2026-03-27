import Task from '../models/Task.model.js';
import Project from '../models/Project.model.js';
import Notification from '../models/Notification.model.js';
import { logActivity } from '../utils/activityLog.utils.js';
import { emitToProject, emitToUser } from '../sockets/index.js';
import { notifyMentions } from '../services/mention.service.js';

const populateTask = (query) =>
  query
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name avatar')
    .populate('comments.author', 'name avatar')
    .populate('blockedBy', 'title status priority')
    .populate('blocks', 'title status priority');

const syncTaskDependencies = async (task, nextBlockedBy = []) => {
  const taskId = task._id.toString();
  const prevSet = new Set((task.blockedBy || []).map((id) => id.toString()));
  const nextSet = new Set((nextBlockedBy || []).map((id) => id.toString()).filter((id) => id !== taskId));

  const toAdd = [...nextSet].filter((id) => !prevSet.has(id));
  const toRemove = [...prevSet].filter((id) => !nextSet.has(id));

  if (toAdd.length) {
    await Task.updateMany(
      { _id: { $in: toAdd } },
      { $addToSet: { blocks: task._id } }
    );
  }
  if (toRemove.length) {
    await Task.updateMany(
      { _id: { $in: toRemove } },
      { $pull: { blocks: task._id } }
    );
  }

  task.blockedBy = [...nextSet];
};

// ── GET tasks for a project ───────────────────────────────────────────────────
export const getTasks = async (req, res, next) => {
  try {
    const { project } = req.query;
    if (!project) return res.status(400).json({ success: false, message: 'project query required' });

    const proj = await Project.findById(project);
    if (!proj || !proj.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const tasks = await populateTask(
      Task.find({ project }).sort('status order -createdAt')
    ).lean({ virtuals: true });

    res.json({ success: true, tasks });
  } catch (err) { next(err); }
};

// ── GET my tasks (across all projects) ────────────────────────────────────────
export const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await populateTask(
      Task.find({ assignees: req.user._id, status: { $ne: 'done' } })
        .populate('project', 'name color workspace')
        .sort('dueDate -priority -createdAt')
        .limit(50)
    ).lean({ virtuals: true });

    res.json({ success: true, tasks });
  } catch (err) { next(err); }
};

// ── GET single task ───────────────────────────────────────────────────────────
export const getTask = async (req, res, next) => {
  try {
    const task = await populateTask(Task.findById(req.params.id)).lean({ virtuals: true });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (err) { next(err); }
};

// ── CREATE task ───────────────────────────────────────────────────────────────
export const createTask = async (req, res, next) => {
  try {
    const { title, description, project, status = 'todo', priority = 'medium',
      assignees = [], dueDate, tags } = req.body;

    const proj = await Project.findById(project);
    if (!proj || !proj.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Order: place at end of column
    const lastTask = await Task.findOne({ project, status }).sort('-order');
    const order = (lastTask?.order ?? -1) + 1;

    const task = await Task.create({
      title, description, project, status, priority, assignees, dueDate, tags, order,
      workspace: proj.workspace,
      createdBy: req.user._id,
    });

    const populated = await populateTask(Task.findById(task._id)).lean({ virtuals: true });

    // Notify assignees
    for (const userId of assignees) {
      if (userId.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: userId, sender: req.user._id, type: 'task_assigned',
          title: 'Task assigned to you',
          message: `${req.user.name} assigned you "${title}"`,
          link: `/workspace/${proj.workspace}/project/${project}/board`,
          metadata: { taskId: task._id, projectId: project, workspaceId: proj.workspace },
        });
        emitToUser(req.app.get('io'), userId.toString(), 'notification:new', {
          type: 'task_assigned', message: `${req.user.name} assigned you "${title}"`,
        });
      }
    }

    emitToProject(req.app.get('io'), project, 'task:created', populated);

    await notifyMentions({
      io: req.app.get('io'),
      sender: req.user,
      workspaceId: proj.workspace,
      contextType: 'a task',
      contextTitle: title,
      contextLink: `/workspace/${proj.workspace}/project/${project}/board?taskId=${task._id}`,
      metadata: { taskId: task._id, projectId: project },
      rawText: `${title}\n${description || ''}`,
    });

    logActivity({ actor: req.user._id, action: 'task_created', project, workspace: proj.workspace,
      task: task._id, description: `Created task "${title}"` });

    res.status(201).json({ success: true, task: populated });
  } catch (err) { next(err); }
};

// ── UPDATE task ───────────────────────────────────────────────────────────────
export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const proj = await Project.findById(task.project);
    if (!proj || !proj.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const allowed = ['title', 'description', 'priority', 'dueDate', 'assignees',
      'status', 'tags', 'estimatedHours', 'actualHours', 'subtasks'];
    const changes = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) {
        changes[f] = { from: task[f], to: req.body[f] };
        task[f] = req.body[f];
      }
    });

    await task.save();
    const updated = await populateTask(Task.findById(task._id)).lean({ virtuals: true });

    emitToProject(req.app.get('io'), task.project.toString(), 'task:updated', updated);

    const mentionSource = `${req.body.title || ''}\n${req.body.description || ''}`.trim();
    if (mentionSource) {
      await notifyMentions({
        io: req.app.get('io'),
        sender: req.user,
        workspaceId: proj.workspace,
        contextType: 'a task',
        contextTitle: task.title,
        contextLink: `/workspace/${proj.workspace}/project/${task.project}/board?taskId=${task._id}`,
        metadata: { taskId: task._id, projectId: task.project },
        rawText: mentionSource,
      });
    }

    logActivity({ actor: req.user._id, action: 'task_updated', project: task.project,
      workspace: proj.workspace, task: task._id, description: `Updated task "${task.title}"`, changes });

    res.json({ success: true, task: updated });
  } catch (err) { next(err); }
};

// ── UPDATE task dependencies ───────────────────────────────────────────────────
export const updateTaskDependencies = async (req, res, next) => {
  try {
    const { blockedBy = [] } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const proj = await Project.findById(task.project);
    if (!proj || !proj.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const sameProjectCount = await Task.countDocuments({
      _id: { $in: blockedBy },
      project: task.project,
    });
    if (sameProjectCount !== blockedBy.length) {
      return res.status(400).json({ success: false, message: 'Dependencies must be tasks from same project' });
    }

    await syncTaskDependencies(task, blockedBy);
    await task.save();

    const updated = await populateTask(Task.findById(task._id)).lean({ virtuals: true });
    emitToProject(req.app.get('io'), task.project.toString(), 'task:updated', updated);

    res.json({ success: true, task: updated });
  } catch (err) { next(err); }
};

// ── UPDATE task status (quick drag-and-drop endpoint) ─────────────────────────
export const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const updated = await populateTask(Task.findById(task._id)).lean({ virtuals: true });
    emitToProject(req.app.get('io'), task.project.toString(), 'task:updated', updated);

    res.json({ success: true, task: updated });
  } catch (err) { next(err); }
};

// ── REORDER tasks (after drag-and-drop) ───────────────────────────────────────
export const reorderTasks = async (req, res, next) => {
  try {
    // { updates: [{ id, status, order }] }
    const { updates } = req.body;
    const bulkOps = updates.map(({ id, status, order }) => ({
      updateOne: { filter: { _id: id }, update: { status, order } },
    }));
    await Task.bulkWrite(bulkOps);

    // Broadcast to all project members
    const firstTask = await Task.findById(updates[0]?.id);
    if (firstTask) {
      emitToProject(req.app.get('io'), firstTask.project.toString(), 'tasks:reordered', { updates });
    }

    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── DELETE task ───────────────────────────────────────────────────────────────
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const proj = await Project.findById(task.project);
    if (!proj || !proj.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Task.updateMany(
      { _id: { $in: task.blockedBy || [] } },
      { $pull: { blocks: task._id } }
    );
    await Task.updateMany(
      { _id: { $in: task.blocks || [] } },
      { $pull: { blockedBy: task._id } }
    );
    await task.deleteOne();
    emitToProject(req.app.get('io'), task.project.toString(), 'task:deleted', { taskId: task._id });

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};

// ── ADD comment ────────────────────────────────────────────────────────────────
export const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author: req.user._id, content: content.trim() } } },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const updated = await populateTask(Task.findById(task._id)).lean({ virtuals: true });
    emitToProject(req.app.get('io'), task.project.toString(), 'task:updated', updated);

    const createdComment = updated.comments?.[updated.comments.length - 1];
    await notifyMentions({
      io: req.app.get('io'),
      sender: req.user,
      workspaceId: task.workspace,
      contextType: 'a comment',
      contextTitle: task.title,
      contextLink: `/workspace/${task.workspace}/project/${task.project}/board?taskId=${task._id}&commentId=${createdComment?._id || ''}`,
      metadata: { taskId: task._id, commentId: createdComment?._id, projectId: task.project },
      rawText: content,
    });

    logActivity({ actor: req.user._id, action: 'task_commented', task: task._id,
      project: task.project, workspace: task.workspace, description: `Commented on "${task.title}"` });

    res.json({ success: true, task: updated });
  } catch (err) { next(err); }
};

// ── DELETE comment ─────────────────────────────────────────────────────────────
export const deleteComment = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $pull: { comments: { _id: req.params.commentId } } },
      { new: true }
    );
    const updated = await populateTask(Task.findById(task._id)).lean({ virtuals: true });
    res.json({ success: true, task: updated });
  } catch (err) { next(err); }
};
