import { useMemo, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useTaskStore } from '@store/task.store';
import { useWorkspaceStore } from '@store/workspace.store';
import { useAuthStore } from '@store/auth.store';
import toast from 'react-hot-toast';
import NLPTaskCreator from '@components/ai/NLPTaskCreator';


const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];
const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600 border-gray-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-600 border-red-200',
  critical: 'bg-red-100 text-red-700 border-red-300',
};

export default function CreateTaskModal({ projectId, workspaceId, defaultStatus = 'todo', onClose }) {
  const { createTask } = useTaskStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', status: defaultStatus,
    dueDate: '', tags: '', estimatedHours: '',
  });
  const [loading, setLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionActive, setMentionActive] = useState(false);
  const [titleMentionQuery, setTitleMentionQuery] = useState('');
  const [titleMentionActive, setTitleMentionActive] = useState(false);
  const [showNLP, setShowNLP] = useState(false);


  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const workspaceUsers = (currentWorkspace?.members || []).map((m) => m.user).filter(Boolean);
  const mentionSuggestions = workspaceUsers
    .filter((workspaceUser) => workspaceUser._id !== user?._id)
    .filter((workspaceUser) => {
      if (!mentionActive) return false;
      if (mentionQuery === '') return true;
      const query = mentionQuery.toLowerCase();
      const handle = (workspaceUser.name || '').replace(/\s+/g, '').toLowerCase();
      const emailHandle = (workspaceUser.email || '').split('@')[0]?.toLowerCase() || '';
      return handle.includes(query) || emailHandle.includes(query) || workspaceUser.name?.toLowerCase().includes(query);
    });

  const titleMentionSuggestions = workspaceUsers
    .filter((workspaceUser) => workspaceUser._id !== user?._id)
    .filter((workspaceUser) => {
      if (!titleMentionActive) return false;
      if (titleMentionQuery === '') return true;
      const query = titleMentionQuery.toLowerCase();
      const handle = (workspaceUser.name || '').replace(/\s+/g, '').toLowerCase();
      const emailHandle = (workspaceUser.email || '').split('@')[0]?.toLowerCase() || '';
      return handle.includes(query) || emailHandle.includes(query) || workspaceUser.name?.toLowerCase().includes(query);
    });

  const handleDescriptionChange = (value) => {
    set('description', value);
    const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
    setMentionQuery(match ? match[1] : '');
    setMentionActive(!!match);
  };

  const insertMention = (workspaceUser) => {
    const handle = (workspaceUser.name || '').replace(/\s+/g, '').toLowerCase();
    set('description', form.description.replace(/(?:^|\s)@([a-zA-Z0-9._-]*)$/, (matched) => {
      const prefix = matched.startsWith(' ') ? ' ' : '';
      return `${prefix}@${handle} `;
    }));
    setMentionQuery('');
    setMentionActive(false);
  };

  const handleTitleChange = (value) => {
    set('title', value);
    const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
    setTitleMentionQuery(match ? match[1] : '');
    setTitleMentionActive(!!match);
  };

  const insertTitleMention = (workspaceUser) => {
    const handle = (workspaceUser.name || '').replace(/\s+/g, '').toLowerCase();
    set('title', form.title.replace(/(?:^|\s)@([a-zA-Z0-9._-]*)$/, (matched) => {
      const prefix = matched.startsWith(' ') ? ' ' : '';
      return `${prefix}@${handle} `;
    }));
    setTitleMentionQuery('');
    setTitleMentionActive(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await createTask({
        ...form, project: projectId, tags,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
        dueDate: form.dueDate || undefined,
      });
      toast.success('Task created!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };


  return (
    showNLP ? (
      <NLPTaskCreator projectId={projectId} workspaceId={workspaceId} onClose={() => setShowNLP(false)} />
    ) : (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-in max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
            <h2 className="font-semibold text-gray-900">New task</h2>
            <div className="flex items-center gap-2">
              {/* <button className="btn-secondary text-xs py-1 gap-1">
                <Sparkles size={11} className="text-brand-500" /> AI fill
              </button> */}
              <button
                onClick={() => setShowNLP(true)}
                className="btn-secondary text-xs gap-1.5 py-1.5"
              ><Sparkles size={11} className="text-brand-500" /> AI Create </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={15} /></button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Title */}
            <div className="relative">
              <input className="input text-sm font-medium" placeholder="Task title *"
                value={form.title} onChange={(e) => handleTitleChange(e.target.value)} required autoFocus />
              {titleMentionActive && titleMentionSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 border border-gray-200 rounded-lg bg-white shadow-sm z-20">
                  {titleMentionSuggestions.map((workspaceUser) => (
                    <button
                      key={workspaceUser._id}
                      type="button"
                      onClick={() => insertTitleMention(workspaceUser)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                    >
                      <img src={workspaceUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(workspaceUser.name || 'U')}&background=6366f1&color=fff&size=20`} className="w-5 h-5 rounded-full" />
                      <span className="font-medium text-gray-800">{workspaceUser.name}</span>
                      <span className="text-gray-400">@{workspaceUser.name?.replace(/\s+/g, '').toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="relative">
              <textarea className="input resize-none text-sm" rows={3} placeholder="Add a description..."
                value={form.description} onChange={e => handleDescriptionChange(e.target.value)} />
              {mentionSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 border border-gray-200 rounded-lg bg-white shadow-sm z-20">
                  {mentionSuggestions.map((workspaceUser) => (
                    <button
                      key={workspaceUser._id}
                      type="button"
                      onClick={() => insertMention(workspaceUser)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                    >
                      <img src={workspaceUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(workspaceUser.name || 'U')}&background=6366f1&color=fff&size=20`} className="w-5 h-5 rounded-full" />
                      <span className="font-medium text-gray-800">{workspaceUser.name}</span>
                      <span className="text-gray-400">@{(workspaceUser.name || '').replace(/\s+/g, '').toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priority pills */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Priority</label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button key={p} type="button" onClick={() => set('priority', p)}
                    className={`px-3 py-1 rounded-full text-xs border font-medium capitalize transition-all
                      ${form.priority === p ? PRIORITY_COLORS[p] + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Status + Due date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <select className="input text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Due date</label>
                <input type="date" className="input text-sm" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
              </div>
            </div>

            {/* Tags + Estimate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Tags</label>
                <input className="input text-sm" placeholder="design, backend..." value={form.tags} onChange={e => set('tags', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Comma separated</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Est. hours</label>
                <input type="number" min="0" step="0.5" className="input text-sm" placeholder="0"
                  value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={loading || !form.title.trim()} className="btn-primary flex-1 justify-center">
                {loading ? 'Creating...' : 'Create task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );
}
