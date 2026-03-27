import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { projectAPI } from '@api/index';

const COLORS = { todo: '#d1d5db', in_progress: '#3b82f6', in_review: '#f59e0b', done: '#10b981' };
const PRIORITY_COLORS = { low: '#d1d5db', medium: '#f59e0b', high: '#ef4444', critical: '#991b1b' };

export default function AnalyticsPage() {
  const { projectId } = useParams();
  const [stats, setStats] = useState(null);

  useEffect(() => { projectAPI.getStats(projectId).then(d => setStats(d.stats)).catch(console.error); }, [projectId]);

  if (!stats) return <div className="flex items-center justify-center h-40"><div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>;

  const statusData = stats.statusBreakdown.map(s => ({ name: s._id.replace('_',' '), value: s.count, color: COLORS[s._id] }));
  const priorityData = stats.priorityBreakdown.map(s => ({ name: s._id, value: s.count, color: PRIORITY_COLORS[s._id] }));
  const timelineData = stats.completionTimeline.map(d => ({ date: d._id, completed: d.count }));

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-base font-semibold text-gray-900">Project Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Tasks by status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Tasks by priority</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {priorityData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {timelineData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Completions (last 7 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timelineData}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completed" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {stats.assigneeBreakdown.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Team workload</h3>
          <div className="space-y-3">
            {stats.assigneeBreakdown.map(m => (
              <div key={m._id} className="flex items-center gap-3">
                <img src={m.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user?.name||'U')}&background=6366f1&color=fff&size=24`} className="w-6 h-6 rounded-full" />
                <span className="text-sm text-gray-700 w-28 truncate">{m.user?.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min((m.taskCount / Math.max(...stats.assigneeBreakdown.map(a => a.taskCount))) * 100, 100)}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-16 text-right">{m.completedCount}/{m.taskCount} done</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
