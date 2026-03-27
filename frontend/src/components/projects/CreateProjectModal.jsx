import { useState } from 'react';
import { X, FolderKanban } from 'lucide-react';
import { useWorkspaceStore } from '@store/workspace.store';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function CreateProjectModal({ workspaceId, onClose }) {
  const { createProject } = useWorkspaceStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', priority: 'medium', color: COLORS[0], dueDate: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const project = await createProject({ ...form, workspace: workspaceId });
      toast.success(`Project "${project.name}" created!`);
      navigate(`/workspace/${workspaceId}/project/${project._id}/board`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
              <FolderKanban size={15} className="text-brand-600" />
            </div>
            <h2 className="font-semibold text-gray-900">New project</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Project name *</label>
            <input className="input" placeholder="e.g. Website Redesign" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="What is this project about?"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Due date</label>
              <input type="date" className="input" value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading || !form.name.trim()} className="btn-primary flex-1 justify-center">
              {loading ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
