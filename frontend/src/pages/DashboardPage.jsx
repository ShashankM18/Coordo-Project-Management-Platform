import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertTriangle, Plus,
  FolderKanban, LayoutDashboard, Inbox,
} from 'lucide-react';
import { useAuthStore } from '@store/auth.store';
import { useWorkspaceStore } from '@store/workspace.store';
import { taskAPI } from '@api/index';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import CreateWorkspaceModal from '@components/projects/CreateWorkspaceModal';
import CreateProjectModal from '@components/projects/CreateProjectModal';

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800',
};
const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-gray-100 text-gray-400',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { workspaces, currentWorkspace, fetchWorkspaces, projects, fetchProjects } = useWorkspaceStore();
  const navigate = useNavigate();
  const [myTasks, setMyTasks] = useState([]);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await fetchWorkspaces();
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (currentWorkspace) fetchProjects(currentWorkspace._id);
  }, [currentWorkspace?._id]);

  useEffect(() => {
    taskAPI.getMyTasks()
      .then(d => setMyTasks(d.tasks || []))
      .catch(() => {});
  }, []);

  const activeTasks  = myTasks.filter(t => t.status !== 'done');
  const overdueTasks = myTasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'done');
  const doneTasks    = myTasks.filter(t => t.status === 'done');

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Empty state — no workspaces
  if (!workspaces.length) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
        <FolderKanban size={28} className="text-brand-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Coordo</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Create your first workspace to start managing projects with your team.
      </p>
      <button onClick={() => setShowCreateWs(true)} className="btn-primary gap-2">
        <Plus size={14} /> Create workspace
      </button>
      {showCreateWs && <CreateWorkspaceModal onClose={() => setShowCreateWs(false)} />}
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentWorkspace ? `Viewing: ${currentWorkspace.name}` : "Here's your overview"}
          </p>
        </div>
        <button
          onClick={() => currentWorkspace ? setShowCreateProject(true) : setShowCreateWs(true)}
          className="btn-primary gap-1.5"
        >
          <Plus size={14} />
          {currentWorkspace ? 'New Project' : 'New Workspace'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<LayoutDashboard size={18} className="text-brand-600" />}
          bg="bg-brand-50" label="Projects" value={projects.length} sub="in workspace"
        />
        <StatCard
          icon={<Clock size={18} className="text-blue-600" />}
          bg="bg-blue-50" label="Active tasks" value={activeTasks.length} sub="assigned to me"
        />
        <StatCard
          icon={<AlertTriangle size={18} className="text-red-500" />}
          bg="bg-red-50" label="Overdue" value={overdueTasks.length}
          sub="need attention" accent={overdueTasks.length > 0}
        />
        <StatCard
          icon={<CheckCircle2 size={18} className="text-emerald-600" />}
          bg="bg-emerald-50" label="Completed" value={doneTasks.length} sub="all time"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Projects {currentWorkspace && <span className="text-gray-400 font-normal">· {currentWorkspace.name}</span>}
            </h2>
            <button
              onClick={() => setShowCreateProject(true)}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              <Plus size={11} /> Add
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="card p-10 text-center">
              <FolderKanban size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm mb-3">No projects yet</p>
              <button onClick={() => setShowCreateProject(true)} className="btn-secondary text-xs gap-1">
                <Plus size={12} /> Create your first project
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map(p => (
                <ProjectCard
                  key={p._id}
                  project={p}
                  workspaceId={currentWorkspace?._id}
                  onNavigate={navigate}
                />
              ))}
            </div>
          )}
        </div>

        {/* My tasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">My tasks</h2>
            <span className="text-xs text-gray-400">{myTasks.length} total</span>
          </div>

          {myTasks.length === 0 ? (
            <div className="card p-6 text-center">
              <Inbox size={22} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No tasks assigned to you yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {myTasks.slice(0, 10).map(t => (
                <TaskRow key={t._id} task={t} navigate={navigate} />
              ))}
              {myTasks.length > 10 && (
                <p className="text-xs text-gray-400 text-center pt-1">+{myTasks.length - 10} more tasks</p>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateProject && currentWorkspace && (
        <CreateProjectModal
          workspaceId={currentWorkspace._id}
          onClose={() => setShowCreateProject(false)}
        />
      )}
      {showCreateWs && (
        <CreateWorkspaceModal onClose={() => setShowCreateWs(false)} />
      )}
    </div>
  );
}

function StatCard({ icon, bg, label, value, sub, accent }) {
  return (
    <div className={`card p-4 ${accent ? 'border-red-200' : ''}`}>
      <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-semibold text-gray-700 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  );
}

function ProjectCard({ project, workspaceId, onNavigate }) {
  const total = project.totalTasks || 0;
  const done  = project.completedTasks || 0;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <div
      className="card p-4 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onNavigate(`/workspace/${workspaceId}/project/${project._id}/board`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color || '#6366f1' }} />
          <span className="text-sm font-medium text-gray-900 truncate group-hover:text-brand-600 transition-colors">
            {project.name}
          </span>
        </div>
        <span className={`badge ${STATUS_BADGE[project.status] || 'bg-gray-100 text-gray-500'} ml-2 shrink-0 capitalize`}>
          {project.status?.replace('_', ' ')}
        </span>
      </div>

      {project.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-1">{project.description}</p>
      )}

      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0">{done}/{total}</span>
        {project.dueDate && (
          <span className={`text-xs shrink-0 ${
            isPast(new Date(project.dueDate)) && project.status !== 'completed'
              ? 'text-red-500 font-medium'
              : 'text-gray-400'
          }`}>
            <Clock size={9} className="inline mr-0.5" />
            {format(new Date(project.dueDate), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, navigate }) {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';
  const STATUS_DOT = {
    todo: 'bg-gray-300', in_progress: 'bg-blue-400',
    in_review: 'bg-amber-400', done: 'bg-emerald-400',
  };

  return (
    <div
      className="card px-3 py-2.5 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => task.project?.workspace && navigate(
        `/workspace/${task.project.workspace}/project/${task.project._id}/board`
      )}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[task.status] || 'bg-gray-300'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
            {task.dueDate && (
              <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                {isOverdue ? '⚠ ' : ''}
                {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
