import { useState, useEffect } from 'react';
import { Search, Bell, Plus, X, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@store/auth.store';
import { useNotificationStore } from '@store/notification.store';
import { useWorkspaceStore } from '@store/workspace.store';
import { useChatStore } from '@store/chat.store';
import { taskAPI } from '@api/index';
import CreateTaskModal from '@components/tasks/CreateTaskModal';

export default function Topbar() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const params = useParams();
  const { unreadCount, fetch: fetchNotifs } = useNotificationStore();
  const { currentWorkspace, currentProject } = useWorkspaceStore();
  const { setIsOpen } = useChatStore();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { fetchNotifs(); }, []);

  // Live search
  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (!currentProject) return;
      setSearching(true);
      try {
        const data = await taskAPI.getAll(currentProject._id);
        const q = search.toLowerCase();
        setSearchResults(
          (data.tasks || [])
            .filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
            .slice(0, 6)
        );
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, currentProject]);

  const clearSearch = () => { setSearch(''); setSearchResults([]); };

  // Determine if we can create a task
  const canCreateTask = !!(currentProject?._id && currentWorkspace?._id);

  return (
    <header className="h-14 bg-white border-b border-gray-100 px-5 flex items-center gap-3 shrink-0 relative z-30">
      {/* Search */}
      <div className="flex-1 max-w-sm relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={currentProject ? `Search in ${currentProject.name}...` : 'Search tasks...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                     placeholder:text-gray-400 transition-all"
        />
        {search && (
          <button onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={12} />
          </button>
        )}

        {/* Search dropdown */}
        {(searchResults.length > 0 || searching) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {searching && (
              <div className="px-3 py-2 text-xs text-gray-400">Searching...</div>
            )}
            {searchResults.map(t => (
              <button key={t._id}
                onClick={() => {
                  clearSearch();
                  // Navigate to the board and open task
                  navigate(`/workspace/${currentWorkspace._id}/project/${currentProject._id}/board`);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                <p className="text-xs font-medium text-gray-800 truncate">{t.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs capitalize ${t.status === 'done' ? 'text-emerald-500' : t.status === 'in_progress' ? 'text-blue-500' : 'text-gray-400'}`}>
                    {t.status?.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className={`text-xs capitalize ${t.priority === 'high' || t.priority === 'critical' ? 'text-red-500' : 'text-gray-400'}`}>
                    {t.priority}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* New Task — only shown when inside a project */}
        {canCreateTask ? (
          <button onClick={() => setShowCreateTask(true)} className="btn-primary py-1.5 px-3 text-xs gap-1.5">
            <Plus size={13} /> New Task
          </button>
        ) : (
          <button
            onClick={() => navigate(currentWorkspace ? `/workspace/${currentWorkspace._id}` : '/dashboard')}
            className="btn-secondary py-1.5 px-3 text-xs gap-1.5"
          >
            <Plus size={13} /> New Project
          </button>
        )}

        {/* Chat — only shown when inside a workspace */}
        {currentWorkspace && (
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <MessageSquare size={20} />
          </button>)}
        {/* // )} */}

        {/* Notifications bell */}
        {/* <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-0.5 font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button> */}

        {/* Avatar */}
        <img
          src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6366f1&color=fff&size=28`}
          alt={user?.name}
          onClick={() => navigate('/settings')}
          title={user?.name}
          className="w-7 h-7 rounded-full object-cover cursor-pointer ring-2 ring-brand-100 hover:ring-brand-300 transition-all"
        />
      </div>

      {showCreateTask && canCreateTask && (
        <CreateTaskModal
          projectId={currentProject._id}
          workspaceId={currentWorkspace._id}
          defaultStatus="todo"
          onClose={() => setShowCreateTask(false)}
        />
      )}
    </header>
  );
}
