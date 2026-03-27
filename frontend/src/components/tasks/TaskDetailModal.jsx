import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Calendar, Flag, MessageSquare, CheckSquare, Square, Paperclip, Edit3, Trash2, Send, Sparkles } from 'lucide-react';
import { useTaskStore } from '@store/task.store';
import { useAuthStore } from '@store/auth.store';
import { useWorkspaceStore } from '@store/workspace.store';
import { wikiAPI } from '@api/index';
import { format, isPast } from 'date-fns';
import toast from 'react-hot-toast';

const PRIORITY_BADGE = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700', critical: 'bg-red-200 text-red-800',
};
const STATUS_BADGE = {
  todo: 'bg-gray-100 text-gray-600', in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700', done: 'bg-emerald-100 text-emerald-700',
};
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };

export default function TaskDetailModal({ task: initialTask, onClose }) {
  const { tasks, updateTask, updateDependencies, addComment, deleteTask, setSelectedTask } = useTaskStore();
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const location = useLocation();
  const [task, setTask] = useState(initialTask);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: task.title, description: task.description || '', priority: task.priority, status: task.status, dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '' });
  const [comment, setComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDependencies, setSavingDependencies] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [descriptionMentionQuery, setDescriptionMentionQuery] = useState('');
  const [mentionActive, setMentionActive] = useState(false);
  const [descriptionMentionActive, setDescriptionMentionActive] = useState(false);
  const [titleMentionQuery, setTitleMentionQuery] = useState('');
  const [titleMentionActive, setTitleMentionActive] = useState(false);
  const [linkedWikiPages, setLinkedWikiPages] = useState([]);

  const highlightedCommentId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('commentId');
  }, [location.search]);

  const workspaceUsers = useMemo(
    () => (currentWorkspace?.members || []).map((m) => m.user).filter(Boolean),
    [currentWorkspace]
  );

  const mentionSuggestions = useMemo(() => {
    if (!mentionActive) return [];
    if (mentionQuery === '') {
      return workspaceUsers.filter((workspaceUser) => workspaceUser._id !== user?._id);
    }
    const query = mentionQuery.toLowerCase();
    return workspaceUsers
      .filter((workspaceUser) => workspaceUser._id !== user?._id)
      .filter((workspaceUser) => {
        const handle = (workspaceUser.name || '').toLowerCase().replace(/\s+/g, '');
        const emailHandle = (workspaceUser.email || '').split('@')[0]?.toLowerCase() || '';
        return handle.includes(query) || emailHandle.includes(query) || workspaceUser.name?.toLowerCase().includes(query);
      });
  }, [mentionActive, mentionQuery, workspaceUsers, user?._id]);

  const descriptionMentionSuggestions = useMemo(() => {
    if (!descriptionMentionActive) return [];
    if (descriptionMentionQuery === '') {
      return workspaceUsers.filter((workspaceUser) => workspaceUser._id !== user?._id);
    }
    const query = descriptionMentionQuery.toLowerCase();
    return workspaceUsers
      .filter((workspaceUser) => workspaceUser._id !== user?._id)
      .filter((workspaceUser) => {
        const handle = (workspaceUser.name || '').toLowerCase().replace(/\s+/g, '');
        const emailHandle = (workspaceUser.email || '').split('@')[0]?.toLowerCase() || '';
        return handle.includes(query) || emailHandle.includes(query) || workspaceUser.name?.toLowerCase().includes(query);
      });
  }, [descriptionMentionActive, descriptionMentionQuery, workspaceUsers, user?._id]);

  const titleMentionSuggestions = useMemo(() => {
    if (!titleMentionActive) return [];
    const available = workspaceUsers.filter((workspaceUser) => workspaceUser._id !== user?._id);
    if (titleMentionQuery === '') return available;
    const query = titleMentionQuery.toLowerCase();
    return available.filter((workspaceUser) => {
      const handle = (workspaceUser.name || '').toLowerCase().replace(/\s+/g, '');
      const emailHandle = (workspaceUser.email || '').split('@')[0]?.toLowerCase() || '';
      return handle.includes(query) || emailHandle.includes(query) || workspaceUser.name?.toLowerCase().includes(query);
    });
  }, [titleMentionActive, titleMentionQuery, workspaceUsers, user?._id]);

  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';
  const blockedByIds = (task.blockedBy || []).map((blockedTask) => blockedTask._id || blockedTask);

  const dependencyCandidates = useMemo(
    () => tasks.filter((candidateTask) => candidateTask._id !== task._id),
    [tasks, task._id]
  );

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
    if (!task?.project) return;
    wikiAPI.list(task.project, task._id)
      .then((data) => setLinkedWikiPages(data.pages || []))
      .catch(() => setLinkedWikiPages([]));
  }, [task?._id, task?.project]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateTask(task._id, editForm);
      setTask(updated);
      setEditing(false);
      toast.success('Task updated');
    } catch {
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSavingComment(true);
    try {
      await addComment(task._id, comment.trim());
      // Refresh from store
      const updated = useTaskStore.getState().tasks.find(t => t._id === task._id);
      if (updated) setTask(updated);
      setComment('');
      setMentionActive(false);
      setMentionQuery('');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSavingComment(false);
    }
  };

  const handleCommentInput = (value) => {
    setComment(value);
    const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
    setMentionQuery(match ? match[1] : '');
    setMentionActive(!!match);
  };

  const insertMention = (workspaceUser) => {
    const handle = (workspaceUser.name || '').replace(/\s+/g, '').toLowerCase();
    setComment((prev) => prev.replace(/(?:^|\s)@([a-zA-Z0-9._-]*)$/, (matched) => {
      const prefix = matched.startsWith(' ') ? ' ' : '';
      return `${prefix}@${handle} `;
    }));
    setMentionActive(false);
    setMentionQuery('');
  };

  const handleDescriptionInput = (value) => {
    setEditForm((formState) => ({ ...formState, description: value }));
    const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
    setDescriptionMentionQuery(match ? match[1] : '');
    setDescriptionMentionActive(!!match);
  };

  const handleTitleInput = (value) => {
    setEditForm((formState) => ({ ...formState, title: value }));
    const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
    setTitleMentionQuery(match ? match[1] : '');
    setTitleMentionActive(!!match);
  };

  const insertTitleMention = (workspaceUser) => {
    const handle = (workspaceUser.name || '').replace(/\s+/g, '').toLowerCase();
    setEditForm((formState) => ({
      ...formState,
      title: formState.title.replace(/(?:^|\s)@([a-zA-Z0-9._-]*)$/, (matched) => {
        const prefix = matched.startsWith(' ') ? ' ' : '';
        return `${prefix}@${handle} `;
      }),
    }));
    setTitleMentionActive(false);
    setTitleMentionQuery('');
  };

  const insertDescriptionMention = (workspaceUser) => {
    const handle = (workspaceUser.name || '').replace(/\s+/g, '').toLowerCase();
    setEditForm((formState) => ({
      ...formState,
      description: formState.description.replace(/(?:^|\s)@([a-zA-Z0-9._-]*)$/, (matched) => {
        const prefix = matched.startsWith(' ') ? ' ' : '';
        return `${prefix}@${handle} `;
      }),
    }));
    setDescriptionMentionActive(false);
    setDescriptionMentionQuery('');
  };

  const renderCommentContent = (content = '') => {
    const parts = content.split(/(@[a-zA-Z0-9._-]+)/g);
    return (
      <span className="text-xs text-gray-600">
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            return (
              <span key={`${part}-${index}`} className="text-brand-700 bg-brand-50 px-1 rounded">
                {part}
              </span>
            );
          }
          return <span key={`${part}-${index}`}>{part}</span>;
        })}
      </span>
    );
  };

  const toggleDependency = async (candidateTaskId) => {
    const exists = blockedByIds.includes(candidateTaskId);
    const nextBlockedBy = exists
      ? blockedByIds.filter((id) => id !== candidateTaskId)
      : [...blockedByIds, candidateTaskId];

    setSavingDependencies(true);
    try {
      const updated = await updateDependencies(task._id, nextBlockedBy);
      setTask(updated);
      toast.success('Dependencies updated');
    } catch {
      toast.error('Failed to update dependencies');
    } finally {
      setSavingDependencies(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    await deleteTask(task._id);
    toast.success('Task deleted');
    onClose();
  };

  const toggleSubtask = async (idx) => {
    const newSubtasks = task.subtasks.map((s, i) =>
      i === idx ? { ...s, isCompleted: !s.isCompleted } : s
    );
    try {
      const updated = await updateTask(task._id, { subtasks: newSubtasks });
      setTask(updated);
    } catch { toast.error('Failed to update subtask'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl animate-slide-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            {editing ? (
              <div className="relative">
                <input
                  className="input font-semibold text-gray-900 text-sm w-full"
                  value={editForm.title}
                  onChange={(e) => handleTitleInput(e.target.value)}
                />
                {titleMentionSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 border border-gray-200 rounded-lg bg-white shadow-sm z-20">
                    {titleMentionSuggestions.map((workspaceUser) => (
                      <button
                        key={workspaceUser._id}
                        type="button"
                        onClick={() => insertTitleMention(workspaceUser)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                      >
                        <img
                          src={workspaceUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(workspaceUser.name || 'U')}&background=6366f1&color=fff&size=20`}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="font-medium text-gray-800">{workspaceUser.name}</span>
                        <span className="text-gray-400">@{workspaceUser.name?.replace(/\s+/g, '').toLowerCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <h2 className="font-semibold text-gray-900 text-sm leading-snug">{task.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {editing ? (
                <>
                  <select className="input text-xs py-1 w-auto" value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <select className="input text-xs py-1 w-auto capitalize" value={editForm.priority}
                    onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                    {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <span className={`badge ${STATUS_BADGE[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                  <span className={`badge ${PRIORITY_BADGE[task.priority]} capitalize`}>{task.priority}</span>
                  {overdue && <span className="badge bg-red-100 text-red-600">Overdue</span>}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                  <Edit3 size={14} />
                </button>
                <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"><X size={15} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {/* Main area */}
            <div className="sm:col-span-2 p-5 space-y-5">
              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Description</label>
                {editing ? (
                  <div className="relative">
                    <textarea className="input resize-none text-sm" rows={4}
                      value={editForm.description} onChange={e => handleDescriptionInput(e.target.value)} />
                    {descriptionMentionSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 border border-gray-200 rounded-lg bg-white shadow-sm z-20">
                        {descriptionMentionSuggestions.map((workspaceUser) => (
                          <button
                            key={workspaceUser._id}
                            type="button"
                            onClick={() => insertDescriptionMention(workspaceUser)}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                          >
                            <img src={workspaceUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(workspaceUser.name || 'U')}&background=6366f1&color=fff&size=20`}
                              className="w-5 h-5 rounded-full" />
                            <span className="font-medium text-gray-800">{workspaceUser.name}</span>
                            <span className="text-gray-400">@{workspaceUser.name?.replace(/\s+/g, '').toLowerCase()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {task.description || <span className="text-gray-400 italic">No description</span>}
                  </p>
                )}
              </div>

              {/* Subtasks */}
              {task.subtasks?.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                    <CheckSquare size={12} /> Subtasks ({task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length})
                  </label>
                  <div className="space-y-1.5">
                    {task.subtasks.map((s, i) => (
                      <div key={i} onClick={() => toggleSubtask(i)}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors">
                        {s.isCompleted
                          ? <CheckSquare size={15} className="text-emerald-500 shrink-0" />
                          : <Square size={15} className="text-gray-300 group-hover:text-gray-500 shrink-0" />}
                        <span className={`text-sm ${s.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>{s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI suggestions banner */}
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 flex items-start gap-2.5">
                <Sparkles size={14} className="text-brand-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-brand-700">AI Assistant</p>
                  <p className="text-xs text-brand-600 mt-0.5">Ask AI to break this task into subtasks, estimate time, or suggest assignees.</p>
                  <button className="text-xs text-brand-700 font-medium hover:text-brand-800 mt-1.5 underline underline-offset-2">
                    Analyze with AI →
                  </button>
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-3 flex items-center gap-1.5">
                  <MessageSquare size={12} /> Comments ({task.comments?.length || 0})
                </label>
                <div className="space-y-3 mb-3">
                  {task.comments?.map(c => (
                    <div key={c._id} className={`flex gap-2.5 rounded-lg ${highlightedCommentId === c._id ? 'ring-2 ring-brand-200 bg-brand-50/50 p-1.5' : ''}`}>
                      <img src={c.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author?.name || 'U')}&background=6366f1&color=fff&size=24`}
                        className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                      <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-800">{c.author?.name}</span>
                          <span className="text-xs text-gray-400">{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                        <p>{renderCommentContent(c.content)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleComment} className="flex gap-2">
                  <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6366f1&color=fff&size=24`}
                    className="w-6 h-6 rounded-full object-cover shrink-0 mt-1" />
                  <div className="flex-1 flex gap-2">
                    <input className="input flex-1 text-xs" placeholder="Add a comment..."
                      value={comment} onChange={e => handleCommentInput(e.target.value)} />
                    <button type="submit" disabled={!comment.trim() || savingComment}
                      className="btn-primary px-3 py-1.5 text-xs gap-1">
                      <Send size={11} /> Send
                    </button>
                  </div>
                </form>
                {mentionSuggestions.length > 0 && (
                  <div className="mt-2 ml-8 border border-gray-200 rounded-lg bg-white shadow-sm max-w-sm">
                    {mentionSuggestions.map((workspaceUser) => (
                      <button
                        key={workspaceUser._id}
                        type="button"
                        onClick={() => insertMention(workspaceUser)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                      >
                        <img
                          src={workspaceUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(workspaceUser.name || 'U')}&background=6366f1&color=fff&size=20`}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="font-medium text-gray-800">{workspaceUser.name}</span>
                        <span className="text-gray-400">@{workspaceUser.name?.replace(/\s+/g, '').toLowerCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar details */}
            <div className="p-5 space-y-4 bg-gray-50">
              {/* Assignees */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Assignees</p>
                {task.assignees?.length ? (
                  <div className="space-y-1.5">
                    {task.assignees.map(u => (
                      <div key={u._id} className="flex items-center gap-2">
                        <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=6366f1&color=fff&size=20`}
                          className="w-5 h-5 rounded-full object-cover" />
                        <span className="text-xs text-gray-700">{u.name}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400">Unassigned</p>}
              </div>

              {/* Due date */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Calendar size={11} /> Due date</p>
                {editing ? (
                  <input type="date" className="input text-xs" value={editForm.dueDate}
                    onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} />
                ) : task.dueDate ? (
                  <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                  </span>
                ) : <span className="text-xs text-gray-400">No due date</span>}
              </div>

              {/* Created by */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Created by</p>
                <div className="flex items-center gap-2">
                  <img src={task.createdBy?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.createdBy?.name || 'U')}&background=6366f1&color=fff&size=20`}
                    className="w-5 h-5 rounded-full object-cover" />
                  <span className="text-xs text-gray-600">{task.createdBy?.name}</span>
                </div>
              </div>

              {/* Tags */}
              {task.tags?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-brand-50 text-brand-600 text-xs rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Time estimate */}
              {task.estimatedHours && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Estimated time</p>
                  <p className="text-xs text-gray-600">{task.estimatedHours}h</p>
                </div>
              )}

              {/* Dependencies */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Blocked By</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {dependencyCandidates.map((candidateTask) => {
                    const checked = blockedByIds.includes(candidateTask._id);
                    return (
                      <label key={candidateTask._id} className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={savingDependencies}
                          onChange={() => toggleDependency(candidateTask._id)}
                        />
                        <span className="truncate">{candidateTask.title}</span>
                      </label>
                    );
                  })}
                  {!dependencyCandidates.length && (
                    <p className="text-xs text-gray-400">No other tasks available</p>
                  )}
                </div>
              </div>

              {/* Linked wiki pages */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Linked Wiki Pages</p>
                {linkedWikiPages.length ? (
                  <div className="space-y-1.5">
                    {linkedWikiPages.map((page) => (
                      <a
                        key={page._id}
                        href={`/workspace/${task.workspace}/project/${task.project}/wiki?pageId=${page._id}`}
                        className="block text-xs text-brand-700 hover:underline truncate"
                      >
                        {page.title}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No linked wiki pages</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
