import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Bell, Sparkles, Settings, Video,
  ChevronDown, Plus, LogOut, FolderKanban, Building2,
} from 'lucide-react';
import { useAuthStore } from '@store/auth.store';
import { useWorkspaceStore } from '@store/workspace.store';
import CreateWorkspaceModal from '@components/projects/CreateWorkspaceModal';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const {
    workspaces, currentWorkspace, fetchWorkspaces, setCurrentWorkspace,
    projects, fetchProjects,
  } = useWorkspaceStore();
  const [wsDropOpen, setWsDropOpen] = useState(false);
  const [showCreateWs, setShowCreateWs] = useState(false);

  useEffect(() => { fetchWorkspaces(); }, []);

  useEffect(() => {
    if (currentWorkspace) {
      fetchProjects(currentWorkspace._id);
    }
  }, [currentWorkspace?._id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const switchWorkspace = (ws) => {
    setCurrentWorkspace(ws);
    setWsDropOpen(false);
    navigate(`/workspace/${ws._id}`);
  };

  const mainNav = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/meetings', icon: Video, label: 'Meetings' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/ai-assistant', icon: Sparkles, label: 'AI Assistant' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-full shrink-0">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <FolderKanban size={14} className="text-white" />
          </div>
          <button onClick={() => navigate('/dashboard')} className="font-bold text-gray-900 text-sm tracking-tight">Coordo</button>
        </div>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 py-3 border-b border-gray-100">
        <button
          onClick={() => setWsDropOpen(o => !o)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded bg-brand-100 flex items-center justify-center shrink-0">
              <Building2 size={11} className="text-brand-700" />
            </div>
            <span className="text-xs font-semibold text-gray-700 truncate">
              {currentWorkspace?.name || 'Select workspace'}
            </span>
          </div>
          <ChevronDown
            size={12}
            className={`text-gray-400 transition-transform shrink-0 ${wsDropOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {wsDropOpen && (
          <div className="mt-1 space-y-0.5 animate-fade-in">
            {workspaces.map(ws => (
              <button
                key={ws._id}
                onClick={() => switchWorkspace(ws)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors
                  ${currentWorkspace?._id === ws._id
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {ws.name}
              </button>
            ))}
            <button
              onClick={() => { setWsDropOpen(false); setShowCreateWs(true); }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-brand-600 hover:bg-brand-50 flex items-center gap-1.5 transition-colors font-medium"
            >
              <Plus size={11} /> New workspace
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {mainNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors
               ${isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
            }
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}

        {/* Projects section */}
        {currentWorkspace && projects.length > 0 && (
          <div className="pt-3">
            <div className="flex items-center justify-between px-2.5 mb-1">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Projects</p>
              <button
                onClick={() => navigate(`/workspace/${currentWorkspace._id}`)}
                className="text-gray-400 hover:text-brand-600 transition-colors"
                title="View all projects"
              >
                <Plus size={12} />
              </button>
            </div>
            {projects.slice(0, 8).map(proj => (
              <NavLink
                key={proj._id}
                to={`/workspace/${currentWorkspace._id}/project/${proj._id}/board`}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors
                   ${isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
                }
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: proj.color || '#6366f1' }}
                />
                <span className="truncate">{proj.name}</span>
              </NavLink>
            ))}
            {projects.length > 8 && (
              <button
                onClick={() => navigate(`/workspace/${currentWorkspace._id}`)}
                className="w-full text-left px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600"
              >
                +{projects.length - 8} more
              </button>
            )}
          </div>
        )}

        {currentWorkspace && projects.length === 0 && (
          <div className="pt-3">
            <p className="px-2.5 text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Projects</p>
            <button
              onClick={() => navigate(`/workspace/${currentWorkspace._id}`)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Plus size={11} /> Create project
            </button>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg group hover:bg-gray-50 transition-colors">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6366f1&color=fff&size=28`}
            alt={user?.name}
            className="w-7 h-7 rounded-full object-cover shrink-0 cursor-pointer"
            onClick={() => navigate('/settings')}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {showCreateWs && (
        <CreateWorkspaceModal onClose={() => setShowCreateWs(false)} />
      )}
    </aside>
  );
}
