import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, Trash2, Plus } from 'lucide-react';
import { taskAPI, wikiAPI } from '@api/index';
import { useWorkspaceStore } from '@store/workspace.store';
import { useAuthStore } from '@store/auth.store';
import toast from 'react-hot-toast';

const handleFromUser = (workspaceUser = {}) => (workspaceUser.name || '').replace(/\s+/g, '').toLowerCase();

export default function WikiPage() {
  const { currentWorkspace, currentProject } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [params, setParams] = useSearchParams();

  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionActive, setMentionActive] = useState(false);
  const [titleMentionQuery, setTitleMentionQuery] = useState('');
  const [titleMentionActive, setTitleMentionActive] = useState(false);
  const [linkedTaskIds, setLinkedTaskIds] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const workspaceUsers = useMemo(
    () => (currentWorkspace?.members || []).map((m) => m.user).filter(Boolean),
    [currentWorkspace]
  );

  const mentionSuggestions = useMemo(() => {
    if (!mentionActive) return [];
    const available = workspaceUsers.filter((workspaceUser) => workspaceUser._id !== user?._id);
    if (mentionQuery === '') return available;

    const query = mentionQuery.toLowerCase();
    return available.filter((workspaceUser) => {
      const handle = handleFromUser(workspaceUser);
      const emailHandle = (workspaceUser.email || '').split('@')[0]?.toLowerCase() || '';
      return handle.includes(query) || emailHandle.includes(query) || workspaceUser.name?.toLowerCase().includes(query);
    });
  }, [mentionActive, mentionQuery, workspaceUsers, user?._id]);

  const titleMentionSuggestions = useMemo(() => {
    if (!titleMentionActive) return [];
    const available = workspaceUsers.filter((workspaceUser) => workspaceUser._id !== user?._id);
    if (titleMentionQuery === '') return available;
    const query = titleMentionQuery.toLowerCase();
    return available.filter((workspaceUser) => {
      const handle = handleFromUser(workspaceUser);
      const emailHandle = (workspaceUser.email || '').split('@')[0]?.toLowerCase() || '';
      return handle.includes(query) || emailHandle.includes(query) || workspaceUser.name?.toLowerCase().includes(query);
    });
  }, [titleMentionActive, titleMentionQuery, workspaceUsers, user?._id]);

  const loadPages = async () => {
    if (!currentProject?._id) return;
    setLoading(true);
    try {
      const data = await wikiAPI.list(currentProject._id);
      const fetchedPages = data.pages || [];
      setPages(fetchedPages);

      const pageIdFromQuery = params.get('pageId');
      const selected = fetchedPages.find((page) => page._id === pageIdFromQuery) || fetchedPages[0] || null;
      if (selected) {
        const full = await wikiAPI.getOne(selected._id);
        setCurrentPage(full.page);
        setTitle(full.page.title || '');
        setContent(full.page.content || '');
        setLinkedTaskIds((full.page.linkedTaskIds || []).map((taskId) => taskId._id || taskId));
      } else {
        setCurrentPage(null);
        setTitle('');
        setContent('');
        setLinkedTaskIds([]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load wiki');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, [currentProject?._id]);

  useEffect(() => {
    if (!currentProject?._id) return;
    taskAPI.getAll(currentProject._id)
      .then((data) => setProjectTasks(data.tasks || []))
      .catch(() => setProjectTasks([]));
  }, [currentProject?._id]);

  const selectPage = async (pageId) => {
    const full = await wikiAPI.getOne(pageId);
    setCurrentPage(full.page);
    setTitle(full.page.title || '');
    setContent(full.page.content || '');
    setLinkedTaskIds((full.page.linkedTaskIds || []).map((taskId) => taskId._id || taskId));
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('pageId', pageId);
      return next;
    });
  };

  const handleContentInput = (value) => {
    setContent(value);
    const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
    setMentionQuery(match ? match[1] : '');
    setMentionActive(!!match);
  };

  const handleTitleInput = (value) => {
    setTitle(value);
    const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);
    setTitleMentionQuery(match ? match[1] : '');
    setTitleMentionActive(!!match);
  };

  const insertMention = (workspaceUser) => {
    const handle = handleFromUser(workspaceUser);
    setContent((prev) => prev.replace(/(?:^|\s)@([a-zA-Z0-9._-]*)$/, (matched) => {
      const prefix = matched.startsWith(' ') ? ' ' : '';
      return `${prefix}@${handle} `;
    }));
    setMentionQuery('');
    setMentionActive(false);
  };

  const insertTitleMention = (workspaceUser) => {
    const handle = handleFromUser(workspaceUser);
    setTitle((prev) => prev.replace(/(?:^|\s)@([a-zA-Z0-9._-]*)$/, (matched) => {
      const prefix = matched.startsWith(' ') ? ' ' : '';
      return `${prefix}@${handle} `;
    }));
    setTitleMentionActive(false);
    setTitleMentionQuery('');
  };

  const savePage = async () => {
    if (!title.trim()) return toast.error('Title is required');
    if (!currentProject?._id) return;
    setSaving(true);
    try {
      if (currentPage?._id) {
        const data = await wikiAPI.update(currentPage._id, { title, content, linkedTaskIds });
        setCurrentPage(data.page);
      } else {
        const data = await wikiAPI.create({ title, content, linkedTaskIds, projectId: currentProject._id });
        setCurrentPage(data.page);
        setParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('pageId', data.page._id);
          return next;
        });
      }
      await loadPages();
      toast.success('Wiki saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save wiki');
    } finally {
      setSaving(false);
    }
  };

  const createNewPage = () => {
    setCurrentPage(null);
    setTitle('');
    setContent('');
    setLinkedTaskIds([]);
    setMentionQuery('');
    setMentionActive(false);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('pageId');
      return next;
    });
  };

  const deletePage = async () => {
    if (!currentPage?._id) return;
    if (!confirm('Delete this wiki page?')) return;
    await wikiAPI.delete(currentPage._id);
    toast.success('Wiki deleted');
    createNewPage();
    await loadPages();
  };

  return (
    <div className="h-full min-h-0 flex border border-gray-100 rounded-xl overflow-hidden bg-white">
      <aside className="w-72 border-r border-gray-100 p-3 bg-gray-50/60">
        <button onClick={createNewPage} className="btn-primary w-full justify-center text-xs py-1.5 mb-3 gap-1.5">
          <Plus size={12} /> New Page
        </button>
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {pages.map((page) => (
            <button
              key={page._id}
              type="button"
              onClick={() => selectPage(page._id)}
              className={`w-full text-left px-2.5 py-2 rounded-md text-sm ${currentPage?._id === page._id ? 'bg-brand-50 text-brand-700' : 'hover:bg-white text-gray-700'}`}
            >
              <p className="truncate font-medium">{page.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(page.updatedAt).toLocaleDateString()}</p>
            </button>
          ))}
          {!loading && pages.length === 0 && <p className="text-xs text-gray-400 px-1">No wiki pages yet.</p>}
        </div>
      </aside>

      <main className="flex-1 p-4 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <input
              className="input text-sm font-semibold"
              placeholder="Wiki page title"
              value={title}
              onChange={(e) => handleTitleInput(e.target.value)}
            />
            {titleMentionActive && titleMentionSuggestions.length > 0 && (
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
                    <span className="text-gray-400">@{handleFromUser(workspaceUser)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={savePage} disabled={saving} className="btn-primary text-xs py-1.5 gap-1.5">
            <Save size={12} /> {saving ? 'Saving...' : 'Save'}
          </button>
          {currentPage?._id && (
            <button onClick={deletePage} className="btn-secondary text-xs py-1.5 gap-1.5 text-red-600">
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="relative">
            <textarea
              className="input h-full min-h-[420px] resize-none text-sm"
              placeholder="Write markdown-style notes... use @username to mention teammates."
              value={content}
              onChange={(e) => handleContentInput(e.target.value)}
            />
            {mentionSuggestions.length > 0 && (
              <div className="absolute left-2 right-2 bottom-2 border border-gray-200 rounded-lg bg-white shadow-sm z-20">
                {mentionSuggestions.map((workspaceUser) => (
                  <button
                    key={workspaceUser._id}
                    type="button"
                    onClick={() => insertMention(workspaceUser)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                  >
                    <img src={workspaceUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(workspaceUser.name || 'U')}&background=6366f1&color=fff&size=20`} className="w-5 h-5 rounded-full" />
                    <span className="font-medium text-gray-800">{workspaceUser.name}</span>
                    <span className="text-gray-400">@{handleFromUser(workspaceUser)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border border-gray-100 rounded-lg p-3 overflow-y-auto bg-gray-50/50">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Preview</p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {content || 'Start writing to preview...'}
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Linked Tasks</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {projectTasks.map((task) => {
                  const checked = linkedTaskIds.includes(task._id);
                  return (
                    <label key={task._id} className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setLinkedTaskIds((ids) => (
                          checked ? ids.filter((id) => id !== task._id) : [...ids, task._id]
                        ))}
                      />
                      <span className="truncate">{task.title}</span>
                    </label>
                  );
                })}
                {!projectTasks.length && <p className="text-xs text-gray-400">No tasks in this project</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
