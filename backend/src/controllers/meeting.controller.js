import Meeting from '../models/Meeting.model.js';
import Project from '../models/Project.model.js';
import Workspace from '../models/Workspace.model.js';
import Notification from '../models/Notification.model.js';
import { emitToUser } from '../sockets/index.js';
import { createGoogleMeetLink } from '../services/googleMeet.service.js';

const ensureWorkspaceMembership = async (workspaceId, userId) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) return { ok: false, status: 404, message: 'Workspace not found' };
  const isMember = ws.isMember(userId) || ws.owner.toString() === userId.toString();
  if (!isMember) return { ok: false, status: 403, message: 'Access denied' };
  return { ok: true, workspace: ws };
};

const validateParticipants = async ({ workspaceId, participantIds }) => {
  const unique = [...new Set((participantIds || []).map((id) => String(id)))];
  return unique;
};

export const createMeeting = async (req, res, next) => {
  try {
    const {
      workspaceId,
      projectId,
      topic,
      description,
      startTime,
      endTime,
      participantIds = [],
      all = false,
      timezone = 'UTC',
    } = req.body;

    if (!workspaceId || !topic?.trim()) {
      return res.status(400).json({ success: false, message: 'workspaceId and topic are required' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'startTime and endTime are required' });
    }

    const membership = await ensureWorkspaceMembership(workspaceId, req.user._id);
    if (!membership.ok) return res.status(membership.status).json({ success: false, message: membership.message });

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid startTime or endTime' });
    }
    if (start >= end) {
      return res.status(400).json({ success: false, message: 'endTime must be after startTime' });
    }

    let participantIdStrings = await validateParticipants({ workspaceId, participantIds });
    if (all) {
      participantIdStrings = [...new Set(membership.workspace.members.map((m) => m.user.toString()))];
      participantIdStrings.push(membership.workspace.owner.toString());
      participantIdStrings = [...new Set(participantIdStrings)];
    }

    if (!participantIdStrings.length) {
      return res.status(400).json({ success: false, message: 'At least one participant is required' });
    }

    // Validate all participants belong to this workspace
    const workspaceMemberIds = new Set([
      membership.workspace.owner.toString(),
      ...(membership.workspace.members || []).map((m) => m.user.toString()),
    ]);
    const invalid = participantIdStrings.filter((id) => !workspaceMemberIds.has(id));
    if (invalid.length) {
      return res.status(400).json({ success: false, message: 'All participants must be workspace members' });
    }

    const { googleMeetUrl, googleMeetId } = await createGoogleMeetLink({
      topic: topic.trim(),
      description: description || '',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      timezone,
    });

    const meeting = await Meeting.create({
      workspaceId,
      projectId: projectId || null,
      scheduledBy: req.user._id,
      topic: topic.trim(),
      description: description || '',
      startTime: start,
      endTime: end,
      participants: participantIdStrings,
      googleMeetUrl,
      googleMeetId,
      timezone,
      providerMeta: {
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId: googleMeetId,
      },
    });

    // Notify participants (including scheduler)
    const io = req.app.get('io');
    for (const recipientId of participantIdStrings) {
      const notif = await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        type: 'meeting_scheduled',
        title: 'Meeting scheduled',
        message: `You have a new meeting: "${meeting.topic}"`,
        link: `/meetings?workspaceId=${meeting.workspaceId}&meetingId=${meeting._id}`,
        metadata: {
          workspaceId: meeting.workspaceId,
          projectId: meeting.projectId || undefined,
        },
      });

      const populatedNotif = await Notification.findById(notif._id)
        .populate('sender', 'name avatar')
        .lean();

      emitToUser(io, recipientId.toString(), 'notification:new', populatedNotif);
    }

    // Real-time update: broadcast to workspace room
    io.to(`workspace:${workspaceId}`).emit('meeting:scheduled', {
      meetingId: meeting._id,
      workspaceId: meeting.workspaceId,
      topic: meeting.topic,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
    });

    res.status(201).json({ success: true, meeting });
  } catch (err) { next(err); }
};

export const listMeetings = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    const start = req.query.start ? new Date(req.query.start) : null;
    const end = req.query.end ? new Date(req.query.end) : null;

    if (!workspaceId) return res.status(400).json({ success: false, message: 'workspaceId query required' });

    const membership = await ensureWorkspaceMembership(workspaceId, req.user._id);
    if (!membership.ok) return res.status(membership.status).json({ success: false, message: membership.message });

    const query = { workspaceId };
    if (start && !Number.isNaN(start.getTime())) query.startTime = { ...(query.startTime || {}), $gte: start };
    if (end && !Number.isNaN(end.getTime())) query.startTime = { ...(query.startTime || {}), $lte: end };

    const meetings = await Meeting.find(query)
      .sort('startTime')
      .populate('scheduledBy', 'name avatar')
      .lean({ virtuals: true });

    res.json({ success: true, meetings });
  } catch (err) { next(err); }
};

export const getMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('scheduledBy', 'name avatar')
      .populate('participants', 'name avatar email');
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const membership = await ensureWorkspaceMembership(meeting.workspaceId, req.user._id);
    if (!membership.ok) return res.status(membership.status).json({ success: false, message: membership.message });

    res.json({ success: true, meeting });
  } catch (err) { next(err); }
};

