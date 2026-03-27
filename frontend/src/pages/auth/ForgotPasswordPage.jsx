import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { authAPI } from '@api/index';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail size={20} className="text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 mb-5">
          If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
        </p>
        <Link to="/login" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 justify-center">
          <ArrowLeft size={13} /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Forgot password</h2>
      <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com" required className="input pl-9" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 justify-center mt-5">
        <ArrowLeft size={13} /> Back to login
      </Link>
    </>
  );
}
