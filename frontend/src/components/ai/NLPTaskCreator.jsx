import { useState } from 'react';
import { Sparkles, X, ArrowRight, Check, Loader2 } from 'lucide-react';
import { aiAPI } from '@api/index';
import { useTaskStore } from '@store/task.store';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700', critical: 'bg-red-200 text-red-800',
};

export default function NLPTaskCreator({ projectId, workspaceId, onClose }) {
  const { createTask } = useTaskStore();
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const EXAMPLES = [
    'Assign Sarah to fix the login bug by Friday, high priority',
    'Create a task to write unit tests for the auth module, due next Monday',
    'Design new onboarding flow — critical, due in 2 weeks',
  ];

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const data = await aiAPI.createFromNLP({ text: input });
      setParsed(data.task);
    } catch {
      toast.error('AI parsing failed. Check your API key.');
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!parsed) return;
    setCreating(true);
    try {
      await createTask({
        title: parsed.title,
        description: parsed.description || '',
        priority: parsed.priority || 'medium',
        dueDate: parsed.dueDate || undefined,
        tags: parsed.tags || [],
        status: 'todo',
        project: projectId,
      });
      toast.success('Task created from AI!');
      onClose();
    } catch {
      toast.error('Failed to create task');
    } finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">AI Task Creator</h2>
              <p className="text-xs text-gray-400">Describe your task in plain English</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={15} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Input */}
          <div>
            <textarea className="input resize-none text-sm" rows={3}
              placeholder='e.g. "Assign John to fix the login page bug by Friday, high priority"'
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleParse(); }} />
            <p className="text-xs text-gray-400 mt-1">⌘ + Enter to parse</p>
          </div>

          {/* Examples */}
          {!parsed && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">Try an example:</p>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => setInput(ex)}
                  className="w-full text-left text-xs text-gray-500 hover:text-brand-600 px-3 py-2 bg-gray-50 hover:bg-brand-50 rounded-lg transition-colors">
                  "{ex}"
                </button>
              ))}
            </div>
          )}

          {/* Parse button */}
          {!parsed && (
            <button onClick={handleParse} disabled={!input.trim() || loading}
              className="btn-primary w-full justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Parsing...</> : <><Sparkles size={14} /> Parse with AI</>}
            </button>
          )}

          {/* Parsed result */}
          {parsed && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
                <Check size={14} className="text-green-600 mt-0.5 shrink-0" />
                <p className="text-xs text-green-700 font-medium">AI extracted these task details:</p>
              </div>

              <div className="space-y-2.5 bg-gray-50 rounded-xl p-4">
                <div>
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Title</span>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{parsed.title}</p>
                </div>
                {parsed.description && (
                  <div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Description</span>
                    <p className="text-sm text-gray-600 mt-0.5">{parsed.description}</p>
                  </div>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <span className="text-xs text-gray-400">Priority</span>
                    <div className="mt-0.5">
                      <span className={`badge ${PRIORITY_COLORS[parsed.priority]} capitalize`}>{parsed.priority}</span>
                    </div>
                  </div>
                  {parsed.dueDate && (
                    <div>
                      <span className="text-xs text-gray-400">Due date</span>
                      <p className="text-sm text-gray-700 mt-0.5">{parsed.dueDate}</p>
                    </div>
                  )}
                  {parsed.assigneeName && (
                    <div>
                      <span className="text-xs text-gray-400">Assignee hint</span>
                      <p className="text-sm text-gray-700 mt-0.5">{parsed.assigneeName}</p>
                    </div>
                  )}
                </div>
                {parsed.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {parsed.tags.map(tag => <span key={tag} className="badge bg-brand-50 text-brand-600">{tag}</span>)}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setParsed(null)} className="btn-secondary flex-1 justify-center text-sm">
                  ← Edit
                </button>
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1 justify-center gap-1.5 text-sm">
                  {creating ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                  {creating ? 'Creating...' : 'Create task'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
