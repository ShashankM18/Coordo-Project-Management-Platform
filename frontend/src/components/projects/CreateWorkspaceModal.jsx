import { useState } from 'react';
import { X, Briefcase } from 'lucide-react';
import { useWorkspaceStore } from '@store/workspace.store';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CreateWorkspaceModal({ onClose }) {
  const { createWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const ws = await createWorkspace(form);
      setCurrentWorkspace(ws);
      toast.success(`Workspace "${ws.name}" created!`);
      navigate(`/workspace/${ws._id}`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create workspace');
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
              <Briefcase size={15} className="text-brand-600" />
            </div>
            <h2 className="font-semibold text-gray-900">New workspace</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Workspace name *</label>
            <input className="input" placeholder="e.g. Acme Corp, My Team" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="What is this workspace for?"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading || !form.name.trim()} className="btn-primary flex-1 justify-center">
              {loading ? 'Creating...' : 'Create workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
