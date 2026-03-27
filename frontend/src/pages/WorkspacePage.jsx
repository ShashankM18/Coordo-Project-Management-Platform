import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Mail, Trash2, Crown, FolderKanban } from 'lucide-react';
import { useAuthStore } from '@store/auth.store';
import { useWorkspaceStore } from '@store/workspace.store';
import { workspaceAPI } from '@api/index';
import CreateProjectModal from '@components/projects/CreateProjectModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_BADGE = { active: 'bg-green-100 text-green-700', on_hold: 'bg-amber-100 text-amber-700', completed: 'bg-blue-100 text-blue-700' };

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { projects, fetchProjects, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();

  const [ws, setWs] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const isAdmin = ws?.owner?._id === user?._id || ws?.members?.find(m => m.user?._id === user?._id)?.role === 'admin';

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await workspaceAPI.updateMemberRole(workspaceId, memberId, newRole);
      setWs(prev => ({
        ...prev,
        members: prev.members.map(m => m.user._id === memberId ? { ...m, role: newRole } : m)
      }));
      toast.success('Role updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  useEffect(() => {
    workspaceAPI.getOne(workspaceId).then(d => { setWs(d.workspace); setCurrentWorkspace(d.workspace); }).catch(console.error);
    fetchProjects(workspaceId);
  }, [workspaceId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await workspaceAPI.invite(workspaceId, { email: inviteEmail, role: 'member' });
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err) {
      toast.error(err.message || 'Failed to send invite');
    } finally { setInviting(false); }
  };

  if (!ws) return <div className="flex items-center justify-center h-40"><div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{ws.name}</h1>
          {ws.description && <p className="text-sm text-gray-500 mt-0.5">{ws.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreateProject(true)} className="btn-primary"><Plus size={14} /> New Project</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><FolderKanban size={14} /> Projects ({projects.length})</h2>
          {projects.map(p => {
            const total = p.totalTasks || 0;
            const done = p.completedTasks || 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <div key={p._id} onClick={() => navigate(`/workspace/${workspaceId}/project/${p._id}/board`)}
                className="card p-4 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">{p.name}</span>
                  </div>
                  <span className={`badge ${STATUS_BADGE[p.status] || 'bg-gray-100 text-gray-500'}`}>{p.status?.replace('_',' ')}</span>
                </div>
                {p.description && <p className="text-xs text-gray-500 mb-2 line-clamp-1">{p.description}</p>}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                  <span className="text-xs text-gray-400">{done}/{total} tasks</span>
                </div>
              </div>
            );
          })}
          {projects.length === 0 && (
            <div className="card p-10 text-center">
              <FolderKanban size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No projects yet</p>
              <button onClick={() => setShowCreateProject(true)} className="btn-secondary text-xs mt-3">Create first project</button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Mail size={13} /> Invite member</h3>
            <form onSubmit={handleInvite} className="space-y-2">
              <input className="input text-sm" placeholder="teammate@company.com" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              <button type="submit" disabled={inviting || !inviteEmail} className="btn-primary w-full justify-center text-xs py-1.5">
                {inviting ? 'Sending...' : 'Send invite'}
              </button>
            </form>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users size={13} /> Members ({ws.members?.length})</h3>
            <div className="space-y-2.5">
              {ws.members?.map(m => (
                <div key={m.user?._id} className="flex items-center gap-2.5">
                  <img src={m.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user?.name||'U')}&background=6366f1&color=fff&size=24`} className="w-7 h-7 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{m.user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{m.user?.email}</p>
                  </div>
                  {ws.owner?._id === m.user?._id ? (
                    <Crown size={11} className="text-amber-400 shrink-0" />
                  ) : isAdmin && user?._id !== m.user?._id ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user._id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-md py-1 px-2 cursor-pointer focus:ring-brand-500 font-medium bg-gray-50 text-gray-700 outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <span className="badge bg-gray-100 text-gray-500 capitalize">{m.role?.replace('_',' ')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCreateProject && <CreateProjectModal workspaceId={workspaceId} onClose={() => setShowCreateProject(false)} />}
    </div>
  );
}
