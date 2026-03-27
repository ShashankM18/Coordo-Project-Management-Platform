import WikiPage from '../models/WikiPage.model.js';
import Project from '../models/Project.model.js';
import { notifyMentions } from '../services/mention.service.js';

const ensureProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { ok: false, status: 404, message: 'Project not found' };
  if (!project.isMember(userId)) return { ok: false, status: 403, message: 'Access denied' };
  return { ok: true, project };
};

export const listWikiPages = async (req, res, next) => {
  try {
    const { projectId, taskId } = req.query;
    if (!projectId) return res.status(400).json({ success: false, message: 'projectId query required' });

    const access = await ensureProjectAccess(projectId, req.user._id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    const query = { projectId };
    if (taskId) {
      query.linkedTaskIds = taskId;
    }

    const pages = await WikiPage.find(query)
      .select('title projectId updatedAt createdAt createdBy updatedBy')
      .populate('createdBy', 'name avatar')
      .populate('updatedBy', 'name avatar')
      .sort('-updatedAt');

    res.json({ success: true, pages });
  } catch (err) { next(err); }
};

export const getWikiPage = async (req, res, next) => {
  try {
    const page = await WikiPage.findById(req.params.id)
      .populate('createdBy', 'name avatar')
      .populate('updatedBy', 'name avatar');
    if (!page) return res.status(404).json({ success: false, message: 'Wiki page not found' });

    const access = await ensureProjectAccess(page.projectId, req.user._id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    res.json({ success: true, page });
  } catch (err) { next(err); }
};

export const createWikiPage = async (req, res, next) => {
  try {
    const { title, content = '', projectId, linkedTaskIds = [] } = req.body;
    if (!title?.trim() || !projectId) {
      return res.status(400).json({ success: false, message: 'title and projectId are required' });
    }

    const access = await ensureProjectAccess(projectId, req.user._id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    const page = await WikiPage.create({
      title: title.trim(),
      content,
      linkedTaskIds,
      projectId,
      workspaceId: access.project.workspace,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await notifyMentions({
      io: req.app.get('io'),
      sender: req.user,
      workspaceId: access.project.workspace,
      contextType: 'a wiki page',
      contextTitle: page.title,
      contextLink: `/workspace/${access.project.workspace}/project/${projectId}/wiki?pageId=${page._id}`,
      metadata: { wikiPageId: page._id, projectId, workspaceId: access.project.workspace },
      rawText: `${title}\n${content}`,
    });

    const populated = await WikiPage.findById(page._id)
      .populate('createdBy', 'name avatar')
      .populate('updatedBy', 'name avatar');

    res.status(201).json({ success: true, page: populated });
  } catch (err) { next(err); }
};

export const updateWikiPage = async (req, res, next) => {
  try {
    const page = await WikiPage.findById(req.params.id);
    if (!page) return res.status(404).json({ success: false, message: 'Wiki page not found' });

    const access = await ensureProjectAccess(page.projectId, req.user._id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    if (req.body.title !== undefined) page.title = req.body.title;
    if (req.body.content !== undefined) page.content = req.body.content;
    if (req.body.linkedTaskIds !== undefined) page.linkedTaskIds = req.body.linkedTaskIds;
    page.updatedBy = req.user._id;
    await page.save();

    await notifyMentions({
      io: req.app.get('io'),
      sender: req.user,
      workspaceId: page.workspaceId,
      contextType: 'a wiki page',
      contextTitle: page.title,
      contextLink: `/workspace/${page.workspaceId}/project/${page.projectId}/wiki?pageId=${page._id}`,
      metadata: { wikiPageId: page._id, projectId: page.projectId, workspaceId: page.workspaceId },
      rawText: `${page.title}\n${page.content || ''}`,
    });

    const populated = await WikiPage.findById(page._id)
      .populate('createdBy', 'name avatar')
      .populate('updatedBy', 'name avatar');

    res.json({ success: true, page: populated });
  } catch (err) { next(err); }
};

export const deleteWikiPage = async (req, res, next) => {
  try {
    const page = await WikiPage.findById(req.params.id);
    if (!page) return res.status(404).json({ success: false, message: 'Wiki page not found' });

    const access = await ensureProjectAccess(page.projectId, req.user._id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    await page.deleteOne();
    res.json({ success: true, message: 'Wiki page deleted' });
  } catch (err) { next(err); }
};
