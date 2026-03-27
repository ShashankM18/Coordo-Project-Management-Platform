import Workspace from '../models/Workspace.model.js';
import Notification from '../models/Notification.model.js';
import { emitToUser } from '../sockets/index.js';

const MENTION_REGEX = /@([a-zA-Z0-9._-]+)/g;

export const parseMentionTokens = (text = '') => {
  const tokens = new Set();
  let match = MENTION_REGEX.exec(text);
  while (match) {
    tokens.add(match[1].toLowerCase());
    match = MENTION_REGEX.exec(text);
  }
  return [...tokens];
};

const toMentionHandle = (user = {}) => {
  const fromName = (user.name || '').toLowerCase().replace(/\s+/g, '');
  const fromEmail = (user.email || '').split('@')[0]?.toLowerCase() || '';
  return { fromName, fromEmail };
};

export const resolveMentionedWorkspaceUsers = async ({ workspaceId, tokens, excludeUserId }) => {
  if (!tokens?.length) return [];

  const workspace = await Workspace.findById(workspaceId).populate('members.user', 'name email avatar');
  if (!workspace) return [];

  const tokenSet = new Set(tokens.map((t) => t.toLowerCase()));
  const matched = [];

  for (const member of workspace.members || []) {
    const user = member.user;
    if (!user?._id) continue;
    if (excludeUserId && user._id.toString() === excludeUserId.toString()) continue;

    const { fromName, fromEmail } = toMentionHandle(user);
    if (tokenSet.has(fromName) || tokenSet.has(fromEmail)) {
      matched.push(user);
    }
  }

  return matched;
};

export const notifyMentions = async ({
  io,
  sender,
  workspaceId,
  contextType,
  contextTitle,
  contextLink,
  metadata = {},
  rawText,
}) => {
  const mentionTokens = parseMentionTokens(rawText || '');
  if (!mentionTokens.length) return [];

  const mentionedUsers = await resolveMentionedWorkspaceUsers({
    workspaceId,
    tokens: mentionTokens,
    excludeUserId: sender._id,
  });

  const createdNotifications = [];
  for (const mentionedUser of mentionedUsers) {
    const notification = await Notification.create({
      recipient: mentionedUser._id,
      sender: sender._id,
      type: 'mention',
      title: `You were mentioned in ${contextType}`,
      message: `${sender.name} mentioned you in "${contextTitle}"`,
      link: contextLink,
      metadata: { workspaceId, ...metadata },
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'name avatar')
      .lean();

    emitToUser(io, mentionedUser._id.toString(), 'notification:new', populatedNotification);
    createdNotifications.push(populatedNotification);
  }

  return createdNotifications;
};
