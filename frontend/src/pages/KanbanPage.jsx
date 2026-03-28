import { useEffect, useState, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Calendar, MessageSquare, Paperclip, Flag, Link2,
  Sparkles, GripVertical, Loader2,
} from 'lucide-react';
import { useTaskStore, COLUMNS } from '@store/task.store';
import { taskAPI } from '@api/index';
import { sprintAPI } from '@api/index';
import { useSocket } from '@hooks/useSocket';
import { formatDistanceToNow, isPast } from 'date-fns';
import toast from 'react-hot-toast';
import CreateTaskModal from '@components/tasks/CreateTaskModal';
import TaskDetailModal from '@components/tasks/TaskDetailModal';
import NLPTaskCreator from '@components/ai/NLPTaskCreator';
import ProjectHealthWidget from '@components/ai/ProjectHealthWidget';

const PRIORITY_FLAG = {
  low: 'text-gray-300',
  medium: 'text-amber-400',
  high: 'text-red-400',
  critical: 'text-red-600',
};
const COLUMN_HEADER = {
  todo:        'text-gray-600 bg-gray-100',
  in_progress: 'text-blue-700 bg-blue-100',
  in_review:   'text-amber-700 bg-amber-100',
  done:        'text-emerald-700 bg-emerald-100',
};
const COLUMN_BORDER = {
  todo:        'border-gray-200',
  in_progress: 'border-blue-200',
  in_review:   'border-amber-200',
  done:        'border-emerald-200',
};
const getTaskId = (value) => (typeof value === 'object' && value !== null ? value._id : value);

export default function KanbanPage() {
  const { projectId, workspaceId } = useParams();
  const location = useLocation();
  const { tasks, fetchTasks, setSelectedTask, selectedTask } = useTaskStore();
  const { joinProject, leaveProject } = useSocket();
  const [colMap, setColMap] = useState({});
  const [activeTask, setActiveTask] = useState(null);
  const [createCol, setCreateCol] = useState(null);
  const [showNLP, setShowNLP] = useState(false);
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetchTasks(projectId).then(() => setLoading(false));
    joinProject(projectId);
    sprintAPI.list(projectId).then((data) => setSprints(data.sprints || [])).catch(() => setSprints([]));
    return () => leaveProject(projectId);
  }, [projectId]);

  // Rebuild column map whenever tasks change
  const buildColMap = useCallback(() => {
    const map = {};
    const sprint = sprints.find((currentSprint) => currentSprint._id === selectedSprintId);
    const sprintTaskIds = new Set((sprint?.taskIds || []).map((taskId) => String(getTaskId(taskId))));

    const visibleTasks = tasks.filter((task) => {
      const blockedMatch = showBlockedOnly ? Array.isArray(task.blockedBy) && task.blockedBy.length > 0 : true;
      const sprintMatch = selectedSprintId ? sprintTaskIds.has(String(task._id)) : true;
      return blockedMatch && sprintMatch;
    });
    COLUMNS.forEach(col => {
      map[col.id] = [...visibleTasks.filter(t => t.status === col.id)]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
    return map;
  }, [tasks, showBlockedOnly, selectedSprintId, sprints]);

  useEffect(() => {
    setColMap(buildColMap());
  }, [buildColMap]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const taskIdFromQuery = params.get('taskId');
    if (!taskIdFromQuery || !tasks.length) return;

    const matchedTask = tasks.find((task) => task._id === taskIdFromQuery);
    if (matchedTask) {
      setSelectedTask(matchedTask);
    }
  }, [location.search, tasks, setSelectedTask]);

  const findColOfTask = id =>
    Object.keys(colMap).find(k => colMap[k].some(t => t._id === id));

  const handleDragStart = ({ active }) => {
    const task = tasks.find(t => t._id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const srcCol = findColOfTask(active.id);
    const dstCol = COLUMNS.some(c => c.id === over.id)
      ? over.id
      : findColOfTask(over.id);

    if (!srcCol || !dstCol || srcCol === dstCol) return;

    setColMap(prev => {
      const srcTasks = [...prev[srcCol]];
      const taskIdx = srcTasks.findIndex(t => t._id === active.id);
      if (taskIdx === -1) return prev;
      const [movedTask] = srcTasks.splice(taskIdx, 1);
      const updatedTask = { ...movedTask, status: dstCol };
      return {
        ...prev,
        [srcCol]: srcTasks,
        [dstCol]: [...prev[dstCol], updatedTask],
      };
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    if (!over) {
      setColMap(buildColMap()); // revert
      return;
    }

    const dstCol = COLUMNS.some(c => c.id === over.id)
      ? over.id
      : findColOfTask(over.id);

    if (!dstCol) return;

    const updates = (colMap[dstCol] || []).map((t, i) => ({
      id: t._id, status: dstCol, order: i,
    }));

    try {
      await taskAPI.reorder({ updates });
    } catch {
      toast.error('Could not save position');
      setColMap(buildColMap()); // revert on error
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
    </div>
  );

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Board header */}
      <div className="flex items-center justify-between mb-4 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Board</h2>
          <span className="badge bg-gray-100 text-gray-600">{tasks.length} tasks</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="input text-xs py-1.5 min-w-[170px]"
            value={selectedSprintId}
            onChange={(e) => {
              setSelectedSprintId(e.target.value);
            }}
          >
            <option value="">All Sprints</option>
            {sprints.map((sprint) => (
              <option key={sprint._id} value={sprint._id}>{sprint.name}</option>
            ))}
          </select>
          <ProjectHealthWidget projectId={projectId} />
          {/* <button
            onClick={() => setShowBlockedOnly((value) => !value)}
            className={`btn-secondary text-xs gap-1.5 py-1.5 ${showBlockedOnly ? 'bg-red-50 text-red-700 border-red-200' : ''}`}
          >
            <Link2 size={12} /> {showBlockedOnly ? 'Blocked Only' : 'Show Blocked'}
          </button> */}
          <button
            onClick={() => setShowNLP(true)}
            className="btn-secondary text-xs gap-1.5 py-1.5"
          >
            <Sparkles size={12} className="text-brand-500" /> AI Create
          </button>
          <button
            onClick={() => setCreateCol('todo')}
            className="btn-primary text-xs gap-1.5 py-1.5"
          >
            <Plus size={13} /> Add Task
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex gap-4 h-full pb-4"
            style={{ minWidth: 'max-content', minHeight: 560 }}
          >
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                tasks={colMap[col.id] || []}
                onAdd={() => setCreateCol(col.id)}
                onTaskClick={setSelectedTask}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 150 }}>
            {activeTask && <TaskCard task={activeTask} isOverlay />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      {createCol && (
        <CreateTaskModal
          projectId={projectId}
          workspaceId={workspaceId}
          defaultStatus={createCol}
          onClose={() => setCreateCol(null)}
        />
      )}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
      {showNLP && (
        <NLPTaskCreator
          projectId={projectId}
          workspaceId={workspaceId}
          onClose={() => setShowNLP(false)}
        />
      )}
    </div>
  );
}

// ── Column ─────────────────────────────────────────────────────────────────────
function KanbanColumn({ col, tasks, onAdd, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div
      className={`flex flex-col rounded-xl border-2 bg-gray-50 transition-colors duration-150
        ${isOver ? 'border-brand-300 bg-brand-50/40' : COLUMN_BORDER[col.id]}`}
      style={{ width: 288, maxHeight: '100%' }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className={`badge font-medium ${COLUMN_HEADER[col.id]}`}>
            {col.label}
          </span>
          <span className="text-xs text-gray-400 font-medium">{tasks.length}</span>
        </div>
        <button
          onClick={onAdd}
          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Task list */}
      <SortableContext
        items={tasks.map(t => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="flex-1 px-2.5 space-y-2 overflow-y-auto pb-2"
          style={{ minHeight: 100 }}
        >
          {tasks.map(t => (
            <SortableCard key={t._id} task={t} onClick={() => onTaskClick(t)} />
          ))}
          {tasks.length === 0 && (
            <div
              className="h-20 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 cursor-pointer hover:border-brand-300 hover:text-brand-400 transition-colors"
              onClick={onAdd}
            >
              + Add task
            </div>
          )}
        </div>
      </SortableContext>

      {/* Footer add */}
      <button
        onClick={onAdd}
        className="mx-2.5 mb-2.5 p-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
      >
        <Plus size={12} /> Add task
      </button>
    </div>
  );
}

// ── Sortable wrapper ───────────────────────────────────────────────────────────
function SortableCard({ task, onClick }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: task._id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <TaskCard task={task} onClick={onClick} dragProps={{ ...listeners, ...attributes }} />
    </div>
  );
}

// ── Task card ──────────────────────────────────────────────────────────────────
function TaskCard({ task, onClick, dragProps, isOverlay }) {
  const overdue =
    task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-3 cursor-pointer
        hover:shadow-md hover:border-brand-200 transition-all group select-none
        ${isOverlay ? 'shadow-xl rotate-1 scale-105 border-brand-300' : ''}
        ${overdue
          ? 'border-l-2 border-l-red-400 border-t-gray-100 border-r-gray-100 border-b-gray-100'
          : 'border-gray-100'}`}
    >
      {/* Row 1: drag + title + priority */}
      <div className="flex items-start gap-1.5">
        <div
          {...dragProps}
          onClick={e => e.stopPropagation()}
          className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <GripVertical size={13} />
        </div>
        <p className="text-xs font-medium text-gray-800 flex-1 leading-snug line-clamp-2">
          {task.title}
        </p>
        <Flag size={11} className={`shrink-0 mt-0.5 ${PRIORITY_FLAG[task.priority]}`} />
      </div>

      {/* Description snippet */}
      {task.description && (
        <p className="text-xs text-gray-400 mt-1.5 ml-5 line-clamp-1">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex gap-1 mt-2 ml-5 flex-wrap">
          {task.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-brand-50 text-brand-600 text-xs rounded-md">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Subtask progress */}
      {task.subtaskProgress && (
        <div className="mt-2 ml-5 flex items-center gap-1.5">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-400 rounded-full"
              style={{ width: `${task.subtaskProgress.percent}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">
            {task.subtaskProgress.done}/{task.subtaskProgress.total}
          </span>
        </div>
      )}

      {/* Footer: due date + meta + assignees */}
      <div className="flex items-center justify-between mt-2.5 ml-5">
        <div className="flex items-center gap-2.5">
          {task.dueDate && (
            <span className={`flex items-center gap-0.5 text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              <Calendar size={10} />
              {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
            </span>
          )}
          {task.comments?.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <MessageSquare size={10} />{task.comments.length}
            </span>
          )}
          {task.attachments?.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <Paperclip size={10} />{task.attachments.length}
            </span>
          )}
          {task.blockedBy?.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-red-500 font-medium">
              <Link2 size={10} /> Blocked
            </span>
          )}
        </div>

        {/* Assignee avatars */}
        {task.assignees?.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map(u => (
              <img
                key={u._id}
                title={u.name}
                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=6366f1&color=fff&size=20`}
                className="w-5 h-5 rounded-full ring-1 ring-white object-cover"
              />
            ))}
            {task.assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full ring-1 ring-white bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
