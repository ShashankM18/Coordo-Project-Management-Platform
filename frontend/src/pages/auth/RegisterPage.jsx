import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuthStore } from '@store/auth.store';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    try {
      await register(form);
      toast.success('Account created! Welcome to Coordo');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h2>
      <p className="text-sm text-gray-500 mb-6">Get started with your team workspace</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Full name</label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" name="name" value={form.name} onChange={handleChange}
              placeholder="Jane Smith" required className="input pl-9" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" name="email" value={form.email} onChange={handleChange}
              placeholder="you@company.com" required className="input pl-9" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={showPw ? 'text' : 'password'} name="password" value={form.password}
              onChange={handleChange} placeholder="Min. 8 characters" required className="input pl-9 pr-9" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Must include uppercase, lowercase, and a number</p>
        </div>
        <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-2.5">
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-5">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 font-medium hover:text-brand-700">Sign in</Link>
      </p>
    </>
  );
}
