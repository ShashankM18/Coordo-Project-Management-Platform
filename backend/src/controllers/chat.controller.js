import Message from '../models/Message.model.js';
import Channel from '../models/Channel.model.js';
import Workspace from '../models/Workspace.model.js';
import { buildDMRoomId, getSortedParticipants } from '../services/chat.service.js';
import { notifyMentions } from '../services/mention.service.js';

const ensureWorkspaceMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return { ok: false, status: 404, message: 'Workspace not found' };
  }

  const isOwner = workspace.owner.toString() === userId.toString();
  const isMember = workspace.isMember(userId) || isOwner;
  if (!isMember) {
    return { ok: false, status: 403, message: 'Access denied' };
  }

  return { ok: true, workspace };
};

export const createChannel = async (req, res, next) => {
  try {
    const { workspaceId, name } = req.body;
    if (!workspaceId || !name?.trim()) {
      return res.status(400).json({ success: false, message: 'workspaceId and name are required' });
    }

    const membership = await ensureWorkspaceMembership(workspaceId, req.user._id);
    if (!membership.ok) {
      return res.status(membership.status).json({ success: false, message: membership.message });
    }

    const channel = await Channel.create({
      name: name.trim().toLowerCase(),
      workspaceId,
    });

    res.status(201).json({ success: true, channel });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Channel already exists in this workspace' });
    }
    next(err);
  }
};

export const getChannels = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const membership = await ensureWorkspaceMembership(workspaceId, req.user._id);
    if (!membership.ok) {
      return res.status(membership.status).json({ success: false, message: membership.message });
    }

    await Channel.updateOne(
      { workspaceId, name: 'general' },
      { $setOnInsert: { workspaceId, name: 'general' } },
      { upsert: true }
    );

    const channels = await Channel.find({ workspaceId }).sort('name');
    res.json({ success: true, channels });
  } catch (err) { next(err); }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { content, chatType, channelId, recipientId, workspaceId } = req.body;
    if (!workspaceId || !content?.trim() || !chatType) {
      return res.status(400).json({ success: false, message: 'workspaceId, chatType and content are required' });
    }

    const membership = await ensureWorkspaceMembership(workspaceId, req.user._id);
    if (!membership.ok) {
      return res.status(membership.status).json({ success: false, message: membership.message });
    }

    const normalizedType = String(chatType).toLowerCase();
    if (!['channel', 'direct'].includes(normalizedType)) {
      return res.status(400).json({ success: false, message: 'chatType must be channel or direct' });
    }

    const payload = {
      sender: req.user._id,
      content: content.trim(),
      chatType: normalizedType,
      workspaceId,
    };

    if (normalizedType === 'channel') {
      if (!channelId) {
        return res.status(400).json({ success: false, message: 'channelId is required for channel message' });
      }
      const channel = await Channel.findOne({ _id: channelId, workspaceId });
      if (!channel) {
        return res.status(404).json({ success: false, message: 'Channel not found' });
      }
      payload.channelId = channelId;
    }

    if (normalizedType === 'direct') {
      if (!recipientId) {
        return res.status(400).json({ success: false, message: 'recipientId is required for direct message' });
      }
      if (recipientId === req.user._id.toString()) {
        return res.status(400).json({ success: false, message: 'You cannot message yourself' });
      }

      const recipientMember = membership.workspace.isMember(recipientId)
        || membership.workspace.owner.toString() === recipientId;
      if (!recipientMember) {
        return res.status(403).json({ success: false, message: 'Direct messages are only allowed within the same workspace' });
      }

      payload.participants = getSortedParticipants(req.user._id, recipientId);
    }

    const msg = await Message.create(payload);
    const populatedObj = await msg.populate('sender', 'name avatar');

    const io = req.app.get('io');
    if (normalizedType === 'channel') {
      io.to(`channel:${channelId}`).emit('receiveMessage', populatedObj);
      io.to(`workspace:${workspaceId}`).emit('receiveMessage', populatedObj);
    } else {
      const [first, second] = populatedObj.participants;
      io.to(buildDMRoomId(first, second)).emit('receiveMessage', populatedObj);
    }

    const contextLink = normalizedType === 'channel'
      ? `/workspace/${workspaceId}?chatType=channel&channelId=${channelId}`
      : `/workspace/${workspaceId}?chatType=direct&participantId=${recipientId}`;

    await notifyMentions({
      io,
      sender: req.user,
      workspaceId,
      contextType: normalizedType === 'channel' ? 'a channel message' : 'a direct message',
      contextTitle: normalizedType === 'channel' ? `#${(await Channel.findById(channelId))?.name || 'channel'}` : 'Direct Messages',
      contextLink,
      metadata: {
        messageId: msg._id,
        channelId: channelId || undefined,
        workspaceId,
      },
      rawText: content,
    });

    res.status(201).json({ success: true, message: populatedObj });
  } catch (err) { next(err); }
};

export const getMessages = async (req, res, next) => {
  try {
    const { workspaceId, chatType, channelId, participantId } = req.query;
    if (!workspaceId || !chatType) {
      return res.status(400).json({ success: false, message: 'workspaceId and chatType are required' });
    }

    const membership = await ensureWorkspaceMembership(workspaceId, req.user._id);
    if (!membership.ok) {
      return res.status(membership.status).json({ success: false, message: membership.message });
    }

    const normalizedType = String(chatType).toLowerCase();
    if (!['channel', 'direct'].includes(normalizedType)) {
      return res.status(400).json({ success: false, message: 'chatType must be channel or direct' });
    }

    let query = { workspaceId, chatType: normalizedType };
    if (normalizedType === 'channel') {
      if (!channelId) {
        return res.status(400).json({ success: false, message: 'channelId is required for channel messages' });
      }
      const channel = await Channel.findOne({ _id: channelId, workspaceId });
      if (!channel) {
        return res.status(404).json({ success: false, message: 'Channel not found' });
      }
      query.channelId = channelId;
    } else {
      if (!participantId) {
        return res.status(400).json({ success: false, message: 'participantId is required for direct messages' });
      }
      const participantMember = membership.workspace.isMember(participantId)
        || membership.workspace.owner.toString() === participantId;
      if (!participantMember) {
        return res.status(403).json({ success: false, message: 'Direct messages are only allowed within the same workspace' });
      }
      query.participants = { $all: getSortedParticipants(req.user._id, participantId), $size: 2 };
    }

    const messages = await Message.find(query)
      .populate('sender', 'name avatar')
      .sort('createdAt');

    res.json({ success: true, messages });
  } catch (err) { next(err); }
};
