import { useState } from 'react';
import { X, Settings2, Trash2, AlertTriangle } from 'lucide-react';
import { projectAPI } from '@api/index';
import { useWorkspaceStore } from '@store/workspace.store';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function ProjectSettingsModal({ project, onClose, onUpdate }) {
  const { workspaceId } = useParams();
  const { deleteProject } = useWorkspaceStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: project.name,
    description: project.description || '',
    status: project.status,
    priority: project.priority,
    color: project.color || '#6366f1',
    dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await projectAPI.update(project._id, form);
      onUpdate(data.project);
      toast.success('Project updated');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(project._id);
      toast.success('Project deleted');
      navigate(`/workspace/${workspaceId}`);
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Settings2 size={15} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Project settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={15} /></button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Project name *</label>
            <input className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
              <select className="input" value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Priority</label>
              <select className="input" value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Due date</label>
            <input type="date" className="input" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
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
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>

        {/* Danger zone */}
        <div className="mx-5 mb-5 p-4 border border-red-200 rounded-xl bg-red-50">
          <h3 className="text-xs font-semibold text-red-700 flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} /> Danger zone
          </h3>
          <p className="text-xs text-red-600 mb-3">Deleting this project will permanently remove all tasks and files.</p>
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="btn-danger text-xs py-1.5 gap-1.5">
              <Trash2 size={11} /> Delete project
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-red-700">Are you sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="btn-secondary text-xs py-1 flex-1 justify-center">Cancel</button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="btn-danger text-xs py-1 flex-1 justify-center">
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
