import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspaceAPI } from '@api/index';
import { useAuthStore } from '@store/auth.store';
import toast from 'react-hot-toast';
import { FolderKanban } from 'lucide-react';

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }
    workspaceAPI.acceptInvite(token)
      .then(d => { setStatus('success'); setMessage(d.message); setTimeout(() => navigate('/dashboard'), 2000); })
      .catch(err => { setStatus('error'); setMessage(err.message || 'Invalid invite'); });
  }, [token, isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FolderKanban size={22} className="text-brand-600" />
        </div>
        {status === 'loading' && <p className="text-gray-600 text-sm">Accepting invitation...</p>}
        {status === 'success' && (<><h2 className="font-semibold text-gray-900 mb-1">You're in!</h2><p className="text-sm text-gray-500">{message}. Redirecting...</p></>)}
        {status === 'error' && (<><h2 className="font-semibold text-gray-900 mb-1">Invite invalid</h2><p className="text-sm text-red-500">{message}</p><button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">Go to dashboard</button></>)}
      </div>
    </div>
  );
}
