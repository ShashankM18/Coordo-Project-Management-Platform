import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuthStore } from '@store/auth.store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
      <p className="text-sm text-gray-500 mb-6">Enter your credentials to continue</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" name="email" value={form.email} onChange={handleChange}
              placeholder="you@company.com" required className="input pl-9" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-700">Password</label>
            <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 transition-colors">Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={showPw ? 'text' : 'password'} name="password" value={form.password}
              onChange={handleChange} placeholder="••••••••" required className="input pl-9 pr-9" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-2.5">
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-5">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand-600 font-medium hover:text-brand-700">Create one</Link>
      </p>
    </>
  );
}
