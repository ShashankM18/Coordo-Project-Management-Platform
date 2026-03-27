import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addDays, endOfMonth, format, isSameDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { taskAPI } from '@api/index';
import { useTaskStore } from '@store/task.store';
import { meetingAPI } from '@api/index';
import toast from 'react-hot-toast';
import TaskDetailModal from '@components/tasks/TaskDetailModal';
import { useSocket } from '@hooks/useSocket';

const STATUS_STYLES = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const buildCalendarGrid = (monthDate) => {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfMonth(monthDate);
  const days = [];
  let current = start;
  while (current <= end || days.length % 7 !== 0) {
    days.push(current);
    current = addDays(current, 1);
  }
  return days;
};

export default function CalendarPage() {
  const { projectId, workspaceId } = useParams();
  const { tasks, fetchTasks, selectedTask, setSelectedTask } = useTaskStore();
  const { socket } = useSocket();
  const [month, setMonth] = useState(new Date());
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  useEffect(() => {
    fetchTasks(projectId);
  }, [projectId]);

  useEffect(() => {
    if (!workspaceId) return;
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfMonth(month);
    const start = gridStart.toISOString();
    const end = gridEnd.toISOString();
    setLoadingMeetings(true);
    meetingAPI.list(workspaceId, start, end)
      .then((data) => setMeetings(data.meetings || []))
      .catch(() => setMeetings([]))
      .finally(() => setLoadingMeetings(false));
  }, [workspaceId, month]);

  useEffect(() => {
    if (!socket || !workspaceId) return;
    const onScheduled = (payload) => {
      if (payload?.workspaceId?.toString() !== workspaceId.toString()) return;
      // Soft refresh: refetch meetings for current month window
      const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
      const gridEnd = endOfMonth(month);
      meetingAPI.list(workspaceId, gridStart.toISOString(), gridEnd.toISOString())
        .then((data) => setMeetings(data.meetings || []))
        .catch(() => {});
    };
    socket.on('meeting:scheduled', onScheduled);
    return () => socket.off('meeting:scheduled', onScheduled);
  }, [socket, workspaceId, month]);

  const days = useMemo(() => buildCalendarGrid(month), [month]);
  const tasksWithDates = useMemo(() => tasks.filter((task) => task.dueDate), [tasks]);

  const meetingsByDay = useMemo(() => {
    const map = new Map();
    for (const meeting of meetings) {
      if (!meeting?.startTime) continue;
      const key = new Date(meeting.startTime).toDateString();
      const arr = map.get(key) || [];
      arr.push(meeting);
      map.set(key, arr);
    }
    return map;
  }, [meetings]);

  const moveTaskToDate = async (taskId, date) => {
    try {
      await taskAPI.update(taskId, { dueDate: date.toISOString() });
      await fetchTasks(projectId);
      toast.success(`Task rescheduled to ${format(date, 'MMM d')}`);
    } catch {
      toast.error('Failed to reschedule task');
    }
  };

  return (
    <>
      <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((prev) => subDays(startOfMonth(prev), 1))} className="btn-secondary text-xs py-1.5">Prev</button>
          <button onClick={() => setMonth((prev) => addDays(endOfMonth(prev), 1))} className="btn-secondary text-xs py-1.5">Next</button>
        </div>
        <h2 className="text-sm font-semibold text-gray-800">{format(month, 'MMMM yyyy')}</h2>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <span
            key={status}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
          >
            <span className="w-2 h-2 rounded-full bg-current opacity-70" />
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-xs font-medium text-gray-500 px-1">{day}</div>
        ))}
        {days.map((day) => {
          const dayTasks = tasksWithDates.filter((task) => isSameDay(new Date(task.dueDate), day));
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => draggedTaskId && moveTaskToDate(draggedTaskId, day)}
              className={`min-h-[120px] rounded-lg border p-2 bg-white ${isToday ? 'border-brand-300' : 'border-gray-100'}`}
            >
              <p className={`text-xs mb-1 ${isToday ? 'text-brand-700 font-semibold' : 'text-gray-500'}`}>{format(day, 'd')}</p>
              <div className="space-y-1">
                {dayTasks.map((task) => (
                  <div
                    key={task._id}
                    draggable
                    onDragStart={() => setDraggedTaskId(task._id)}
                    onClick={() => setSelectedTask(task)}
                    className={`text-xs rounded px-2 py-1 cursor-grab active:cursor-grabbing truncate ${STATUS_STYLES[task.status] || 'bg-brand-50 text-brand-700'}`}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}

                {!loadingMeetings && (
                  <>
                    {(meetingsByDay.get(day.toDateString()) || []).slice(0, 3).map((meeting) => (
                      <div
                        key={meeting._id}
                        onClick={() => setSelectedMeeting(meeting)}
                        className="text-[11px] bg-purple-50 text-purple-700 rounded px-2 py-1 cursor-pointer hover:bg-purple-100 truncate border border-purple-100"
                        title={meeting.topic}
                      >
                        {format(new Date(meeting.startTime), 'HH:mm')} · {meeting.topic}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {selectedMeeting && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedMeeting(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl p-5 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{selectedMeeting.topic}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(selectedMeeting.startTime).toLocaleString()} - {new Date(selectedMeeting.endTime).toLocaleTimeString()}
                </p>
              </div>
              <button className="p-1.5 text-gray-400 hover:bg-gray-50 rounded" onClick={() => setSelectedMeeting(null)}>×</button>
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
                Join Google Meet
              </a>
            ) : (
              <div className="mt-4 text-xs text-gray-500">Google Meet link not configured.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
