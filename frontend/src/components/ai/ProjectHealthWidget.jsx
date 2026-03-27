import { useState } from 'react';
import { Activity, Loader2, X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { aiAPI } from '@api/index';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  green:  { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500', label: 'Healthy' },
  yellow: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500', label: 'At risk' },
  red:    { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500', label: 'Critical' },
};

export default function ProjectHealthWidget({ projectId }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const analyze = async () => {
    if (health) { setOpen(true); return; }
    setLoading(true);
    try {
      const data = await aiAPI.projectHealthScore(projectId);
      setHealth(data.health);
      setOpen(true);
    } catch {
      toast.error('Health analysis failed. Check API key.');
    } finally { setLoading(false); }
  };

  const cfg = health ? STATUS_CONFIG[health.status] : null;

  return (
    <>
      <button onClick={analyze} disabled={loading}
        className="btn-secondary text-xs gap-1.5 py-1.5">
        {loading
          ? <Loader2 size={12} className="animate-spin" />
          : <Activity size={12} className={health ? STATUS_CONFIG[health.status]?.color : ''} />}
        {health ? `Health: ${health.score}` : 'Check health'}
        {health && (
          <span className={`w-2 h-2 rounded-full ${health.status === 'green' ? 'bg-emerald-500' : health.status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`} />
        )}
      </button>

      {open && health && cfg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <cfg.icon size={18} className={cfg.color} />
                <h2 className="font-semibold text-gray-900 text-sm">Project Health Score</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={15} /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Score */}
              <div className={`${cfg.bg} ${cfg.border} border rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <span className={`text-2xl font-bold ${cfg.color}`}>{health.score}<span className="text-sm font-normal">/100</span></span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div className={`h-full ${cfg.bar} rounded-full transition-all duration-700`} style={{ width: `${health.score}%` }} />
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-gray-600 leading-relaxed">{health.summary}</p>

              {/* Risks */}
              {health.risks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Identified risks</p>
                  <ul className="space-y-1.5">
                    {health.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-red-400 mt-0.5 shrink-0">⚠</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {health.recommendations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommendations</p>
                  <ul className="space-y-1.5">
                    {health.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-emerald-500 mt-0.5 shrink-0">→</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={() => { setHealth(null); setOpen(false); analyze(); }}
                className="btn-secondary w-full justify-center text-xs">Refresh analysis</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
