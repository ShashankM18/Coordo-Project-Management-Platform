import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, BellOff } from 'lucide-react';
import { useNotificationStore } from '@store/notification.store';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
  task_assigned: '📋', task_commented: '💬', task_completed: '✅',
  task_due_soon: '⏰', task_overdue: '🔴', workspace_invited: '👥',
  project_invited: '📁', ai_analysis_ready: '✨', file_uploaded: '📎', mention: '@',
};

export default function NotificationsPage() {
  const { notifications, unreadCount, fetch, markRead, markAllRead, delete: del, isLoading } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => { fetch(); }, []);

  const handleClick = async (n) => {
    if (!n.isRead) await markRead(n._id);
    if (n.link) navigate(n.link);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await del(id);
    toast.success('Notification removed');
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-brand-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-xs gap-1.5">
            <CheckCheck size={12} /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <BellOff size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">All caught up!</p>
          <p className="text-gray-400 text-sm mt-1">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => (
            <div key={n._id} onClick={() => handleClick(n)}
              className={`flex items-start gap-3.5 p-4 rounded-xl cursor-pointer transition-all group
                ${n.isRead ? 'bg-white hover:bg-gray-50 border border-gray-100' : 'bg-brand-50 border border-brand-100 hover:bg-brand-100/50'}`}>
              {/* Icon */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0
                ${n.isRead ? 'bg-gray-100' : 'bg-brand-100'}`}>
                {TYPE_ICONS[n.type] || '🔔'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.isRead ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {n.sender && (
                    <div className="flex items-center gap-1">
                      <img src={n.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.sender.name||'U')}&background=6366f1&color=fff&size=14`}
                        className="w-3.5 h-3.5 rounded-full" />
                      <span className="text-xs text-gray-400">{n.sender.name}</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {!n.isRead && (
                  <button onClick={e => { e.stopPropagation(); markRead(n._id); }}
                    className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Mark read">
                    <Check size={13} />
                  </button>
                )}
                <button onClick={e => handleDelete(e, n._id)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>

              {!n.isRead && <div className="w-2 h-2 bg-brand-500 rounded-full shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
