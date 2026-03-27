import { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Files, ArrowLeft, Settings2, BookText, CalendarDays, Goal } from 'lucide-react';
import { useWorkspaceStore } from '@store/workspace.store';
import { projectAPI } from '@api/index';
import ProjectSettingsModal from '@components/projects/ProjectSettingsModal';

export default function ProjectPage() {
  const { projectId, workspaceId } = useParams();
  const navigate = useNavigate();
  const { setCurrentProject } = useWorkspaceStore();
  const [project, setProject] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    projectAPI.getOne(projectId)
      .then(d => {
        setProject(d.project);
        setCurrentProject(d.project); // ← wire into store so Topbar "New Task" works
      })
      .catch(console.error);

    return () => setCurrentProject(null); // cleanup on unmount
  }, [projectId]);

  const tabs = [
    { to: 'board',     icon: LayoutDashboard, label: 'Board' },
    { to: 'sprints',   icon: Goal,            label: 'Sprints' },
    { to: 'calendar',  icon: CalendarDays,    label: 'Calendar' },
    { to: 'analytics', icon: BarChart2,       label: 'Analytics' },
    { to: 'files',     icon: Files,           label: 'Files' },
    { to: 'wiki',      icon: BookText,        label: 'Wiki' },
  ];

  const STATUS_BADGE = {
    active: 'bg-green-100 text-green-700',
    on_hold: 'bg-amber-100 text-amber-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Project header bar */}
      <div className="flex items-center gap-3 mb-4 shrink-0 flex-wrap">
        <button
          onClick={() => navigate(`/workspace/${workspaceId}`)}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={15} />
        </button>

        {project ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color || '#6366f1' }} />
            <h1 className="text-base font-semibold text-gray-900 truncate">{project.name}</h1>
            <span className={`badge ${STATUS_BADGE[project.status] || 'bg-gray-100 text-gray-500'} capitalize shrink-0`}>
              {project.status?.replace('_', ' ')}
            </span>
          </div>
        ) : (
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
        )}

        {/* Tab nav */}
        <nav className="flex items-center gap-1 ml-1">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                 ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`
              }
            >
              <Icon size={13} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Members avatars */}
          {project?.members?.length > 0 && (
            <div className="flex -space-x-1.5">
              {project.members.slice(0, 4).map(m => (
                <img
                  key={m.user?._id}
                  title={m.user?.name}
                  src={m.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user?.name||'U')}&background=6366f1&color=fff&size=24`}
                  className="w-6 h-6 rounded-full ring-2 ring-white object-cover"
                />
              ))}
              {project.members.length > 4 && (
                <div className="w-6 h-6 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Project settings"
          >
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      {/* Routed child page */}
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>

      {showSettings && project && (
        <ProjectSettingsModal
          project={project}
          onClose={() => setShowSettings(false)}
          onUpdate={updated => { setProject(updated); setCurrentProject(updated); }}
        />
      )}
    </div>
  );
}
