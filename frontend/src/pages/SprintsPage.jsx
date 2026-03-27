import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { sprintAPI, taskAPI } from '@api/index';
import toast from 'react-hot-toast';

export default function SprintsPage() {
  const { projectId } = useParams();
  const [sprints, setSprints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [sprintData, taskData] = await Promise.all([
      sprintAPI.list(projectId),
      taskAPI.getAll(projectId),
    ]);
    setSprints(sprintData.sprints || []);
    setTasks(taskData.tasks || []);
  };

  useEffect(() => {
    load().catch(() => toast.error('Failed to load sprints'));
  }, [projectId]);

  const taskMap = useMemo(
    () => new Map(tasks.map((task) => [task._id, task])),
    [tasks]
  );
  const selectableTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'done'),
    [tasks]
  );
  const getTaskId = (value) => (typeof value === 'object' && value !== null ? value._id : value);

  useEffect(() => {
    // Keep selection valid when tasks refresh.
    setSelectedTaskIds((ids) => ids.filter((id) => selectableTasks.some((t) => t._id === id)));
  }, [selectableTasks]);

  const createSprint = async () => {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      return toast.error('Name, start date and end date are required');
    }
    setSaving(true);
    try {
      await sprintAPI.create({
        ...form,
        projectId,
        taskIds: selectedTaskIds,
      });
      setForm({ name: '', startDate: '', endDate: '' });
      setSelectedTaskIds([]);
      await load();
      toast.success('Sprint created');
    } catch (err) {
      toast.error(err.message || 'Failed to create sprint');
    } finally {
      setSaving(false);
    }
  };

  const deleteSprint = async (id) => {
    if (!confirm('Delete this sprint?')) return;
    await sprintAPI.delete(id);
    await load();
    toast.success('Sprint deleted');
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Create Sprint</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="input text-sm" placeholder="Sprint name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input type="date" className="input text-sm" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} />
          <input type="date" className="input text-sm" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} />
        </div>
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">Include tasks in this sprint</p>
          <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1.5">
            {selectableTasks.map((task) => (
              <label key={task._id} className="text-xs text-gray-700 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedTaskIds.includes(task._id)}
                  onChange={() => setSelectedTaskIds((ids) => (
                    ids.includes(task._id) ? ids.filter((id) => id !== task._id) : [...ids, task._id]
                  ))}
                />
                <span className="truncate">{task.title}</span>
              </label>
            ))}
            {!selectableTasks.length && (
              <p className="text-xs text-gray-400">No active tasks available (all tasks are done)</p>
            )}
          </div>
        </div>
        <button onClick={createSprint} disabled={saving} className="btn-primary text-xs mt-3 gap-1.5 py-1.5">
          <Plus size={12} /> {saving ? 'Creating...' : 'Create Sprint'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sprints.map((sprint) => (
          <div key={sprint._id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{sprint.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => deleteSprint(sprint._id)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600">
                <Trash2 size={13} />
              </button>
            </div>
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-600 mb-1.5">Tasks ({sprint.taskIds?.length || 0})</p>
              <div className="space-y-1">
                {(sprint.taskIds || []).slice(0, 6).map((taskIdRaw) => {
                  const taskId = getTaskId(taskIdRaw);
                  return (
                    <p key={taskId} className="text-xs text-gray-500 truncate">• {taskMap.get(taskId)?.title || 'Task'}</p>
                  );
                })}
                {(!sprint.taskIds || sprint.taskIds.length === 0) && (
                  <p className="text-xs text-gray-400">No tasks assigned</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
