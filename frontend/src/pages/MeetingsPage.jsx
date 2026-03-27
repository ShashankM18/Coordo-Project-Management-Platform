import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addDays, format, startOfDay } from 'date-fns';
import { meetingAPI } from '@api/index';
import { useWorkspaceStore } from '@store/workspace.store';
import toast from 'react-hot-toast';

const toInputValue = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  // local datetime for <input type="datetime-local" />
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function MeetingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaces, currentWorkspace, fetchWorkspaces, setCurrentWorkspace, fetchWorkspace } = useWorkspaceStore();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [startTime, setStartTime] = useState(toInputValue(new Date(Date.now() + 30 * 60 * 1000)));
  const [endTime, setEndTime] = useState(toInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [all, setAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // If opened from a notification deep link, pick the workspace.
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const wsId = search.get('workspaceId');
    if (!wsId) return;
    if (currentWorkspace?._id === wsId) return;
    const match = workspaces.find((w) => w._id === wsId);
    if (match) setCurrentWorkspace(match);
    // If not found yet, we’ll pick it once workspaces are fetched.
  }, [location.search, workspaces, currentWorkspace?._id, setCurrentWorkspace]);

  useEffect(() => {
    // Ensure currentWorkspace is hydrated so members are available.
    if (currentWorkspace?._id) {
      fetchWorkspace(currentWorkspace._id).catch(() => {});
    }
  }, [currentWorkspace?._id, fetchWorkspace]);

  const refreshMeetings = async (workspaceId) => {
    if (!workspaceId) return;
    try {
      setLoadingMeetings(true);
      const start = startOfDay(new Date());
      const end = addDays(start, 30);
      const res = await meetingAPI.list(workspaceId, start.toISOString(), end.toISOString());
      const now = new Date();
      const upcoming = (res?.meetings || []).filter(m => new Date(m.endTime) > now);
      setMeetings(upcoming);
    } catch {
      setMeetings([]);
    } finally {
      setLoadingMeetings(false);
    }
  };

  useEffect(() => {
    if (!currentWorkspace?._id) return;
    refreshMeetings(currentWorkspace._id);
  }, [currentWorkspace?._id]);

  // If opened from a notification deep link, open meeting details.
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const meetingId = search.get('meetingId');
    if (!meetingId) return;
    meetingAPI.getOne(meetingId)
      .then((res) => setSelectedMeeting(res?.meeting || null))
      .catch((err) => toast.error(err?.message || 'Failed to load meeting'));
  }, [location.search]);

  const members = useMemo(() => {
    const ws = currentWorkspace;
    if (!ws) return [];
    const ownerId = ws.owner?._id || ws.owner;
    const list = [
      ...(ownerId ? [{ user: ws.owner, _id: ownerId, isOwner: true }] : []),
      ...(ws.members || []).map((m) => ({ user: m.user, _id: m.user?._id, isOwner: false })),
    ].filter((m) => m?._id);
    // de-dupe by user id
    const seen = new Set();
    return list.filter((m) => {
      const k = String(m._id);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [currentWorkspace]);

  const toggleMember = (id) => {
    setSelectedIds((prev) => {
      const s = new Set(prev.map(String));
      const key = String(id);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return [...s];
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!currentWorkspace?._id) return toast.error('Select a workspace');
    if (!topic.trim()) return toast.error('Topic is required');
    if (!startTime || !endTime) return toast.error('Start and end time are required');

    const payload = {
      workspaceId: currentWorkspace._id,
      topic: topic.trim(),
      description,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      timezone,
      all,
      participantIds: all ? [] : selectedIds,
    };

    if (!all && (!payload.participantIds || payload.participantIds.length === 0)) {
      return toast.error('Select at least one participant (or use All)');
    }

    try {
      setSubmitting(true);
      const res = await meetingAPI.create(payload);
      toast.success('Meeting scheduled');
      setTopic('');
      setDescription('');
      setAll(true);
      setSelectedIds([]);
      // If a meeting link is configured, show quick link.
      const url = res?.meeting?.googleMeetUrl;
      if (url) {
        toast((t) => (
          <span className="text-sm">
            Meeting scheduled.{' '}
            <a className="underline" href={url} target="_blank" rel="noreferrer" onClick={() => toast.dismiss(t.id)}>
              Open
            </a>
          </span>
        ), { duration: 6000 });
      }
      await refreshMeetings(currentWorkspace._id);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to schedule meeting';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl w-full mx-auto space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Meetings</h1>
        <p className="text-sm text-gray-500 mt-1">Schedule a meeting for a workspace. Invited members get notifications, and it appears in the project calendar.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-1/2">
          <form onSubmit={submit} className="card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-xs font-semibold text-gray-700">Workspace</div>
            <select
              className="input"
              value={currentWorkspace?._id || ''}
              onChange={(e) => {
                const ws = workspaces.find((w) => w._id === e.target.value);
                if (ws) setCurrentWorkspace(ws);
              }}
            >
              <option value="" disabled>Select workspace</option>
              {workspaces.map((ws) => (
                <option key={ws._id} value={ws._id}>{ws.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-xs font-semibold text-gray-700">Timezone</div>
            <input className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" />
          </label>
        </div>

        <label className="space-y-1 block">
          <div className="text-xs font-semibold text-gray-700">Topic</div>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Sprint planning" />
        </label>

        <label className="space-y-1 block">
          <div className="text-xs font-semibold text-gray-700">Description</div>
          <textarea className="input min-h-[90px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Agenda / notes (optional)" />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-xs font-semibold text-gray-700">Start</div>
            <input className="input" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="space-y-1">
            <div className="text-xs font-semibold text-gray-700">End</div>
            <input className="input" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
            Invite all workspace members
          </label>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? 'Scheduling...' : 'Schedule meeting'}
          </button>
        </div>

        {!all && (
          <div className="border border-gray-100 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">Participants</div>
            {!currentWorkspace ? (
              <div className="text-xs text-gray-500">Select a workspace first.</div>
            ) : members.length === 0 ? (
              <div className="text-xs text-gray-500">No members found for this workspace.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map((m) => (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => toggleMember(m._id)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                      selectedIds.map(String).includes(String(m._id))
                        ? 'border-brand-200 bg-brand-50'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <img
                      src={m.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user?.name || 'U')}&background=6366f1&color=fff&size=24`}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">
                        {m.user?.name || 'Member'}{m.isOwner ? ' (Owner)' : ''}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{m.user?.email || ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </form>
      </div>

      <div className="w-full lg:w-1/2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Upcoming (next 30 days)</h2>
          <button
            className="btn-secondary text-xs"
            onClick={() => currentWorkspace?._id && refreshMeetings(currentWorkspace._id)}
            disabled={!currentWorkspace?._id || loadingMeetings}
          >
            Refresh
          </button>
        </div>

        {!currentWorkspace?._id ? (
          <div className="text-sm text-gray-500 mt-3">Select a workspace to see meetings.</div>
        ) : loadingMeetings ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            Loading meetings…
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-sm text-gray-500 mt-3">No meetings scheduled.</div>
        ) : (
          <div className="mt-3 divide-y divide-gray-100">
            {meetings.map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() => {
                  setSelectedMeeting(m);
                  navigate(`/meetings?workspaceId=${currentWorkspace._id}&meetingId=${m._id}`);
                }}
                className="w-full text-left py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{m.topic}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {m.startTime ? format(new Date(m.startTime), 'MMM d, HH:mm') : ''} → {m.endTime ? format(new Date(m.endTime), 'HH:mm') : ''} · {m.timezone || 'UTC'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">
                    {m.googleMeetUrl ? 'Meeting Link' : 'No link'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
      </div>

      {selectedMeeting && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => {
            setSelectedMeeting(null);
            if (currentWorkspace?._id) navigate(`/meetings?workspaceId=${currentWorkspace._id}`);
            else navigate('/meetings');
          }}
        >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl p-5 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{selectedMeeting.topic}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(selectedMeeting.startTime).toLocaleString()} - {new Date(selectedMeeting.endTime).toLocaleTimeString()} · {selectedMeeting.timezone || 'UTC'}
                </p>
              </div>
              <button
                className="p-1.5 text-gray-400 hover:bg-gray-50 rounded"
                onClick={() => {
                  setSelectedMeeting(null);
                  if (currentWorkspace?._id) navigate(`/meetings?workspaceId=${currentWorkspace._id}`);
                  else navigate('/meetings');
                }}
              >
                ×
              </button>
            </div>

            {selectedMeeting.description && (
              <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{selectedMeeting.description}</p>
            )}

            {selectedMeeting.googleMeetUrl ? (
              <a
                href={selectedMeeting.googleMeetUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs mt-4 inline-flex items-center gap-1"
              >
                Join Meeting
              </a>
            ) : (
              <div className="mt-4 text-xs text-gray-500">Meeting link not configured.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

