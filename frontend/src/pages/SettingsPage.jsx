import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Shield, Camera, Save, Check, LogOut } from 'lucide-react';
import { useAuthStore } from '@store/auth.store';
import { userAPI } from '@api/index';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'security', icon: Shield, label: 'Security' },
];

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ name: user?.name || '' });
  const [prefs, setPrefs] = useState(user?.notificationPreferences || {
    emailOnAssign: true, emailOnComment: true, emailOnDeadline: true, inAppNotifications: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const avatarRef = useRef();

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await userAPI.updateProfile({ name: form.name });
      updateUser(data.user);
      setSaved(true);
      toast.success('Profile updated');
      setTimeout(() => setSaved(false), 2000);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handlePrefSave = async () => {
    setSaving(true);
    try {
      await userAPI.updateProfile({ notificationPreferences: prefs });
      toast.success('Preferences saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const data = await userAPI.uploadAvatar(fd);
      updateUser({ avatar: data.avatarUrl });
      toast.success('Avatar updated');
    } catch { toast.error('Avatar upload failed'); }
    e.target.value = '';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Settings</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Your profile</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6366f1&color=fff&size=64`}
                className="w-16 h-16 rounded-full object-cover ring-4 ring-brand-100" />
              <button onClick={() => avatarRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center hover:bg-brand-700 transition-colors">
                <Camera size={11} className="text-white" />
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{user?.role} account</p>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Full name</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input className="input bg-gray-50 cursor-not-allowed" value={user?.email} disabled />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <div className="flex flex-col items-start gap-4 mt-2">
              <button type="submit" disabled={saving} className="btn-primary gap-2">
                {saved ? <><Check size={13} /> Saved</> : <><Save size={13} /> {saving ? 'Saving...' : 'Save changes'}</>}
              </button>

            </div>
          </form>
          <hr className="my-4" />
          <div>
            <button type="button" onClick={handleLogout} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 gap-2">
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {tab === 'notifications' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Notification preferences</h2>
          <div className="space-y-4">
            {[
              { key: 'emailOnAssign', label: 'Task assigned to me', desc: 'Email when a task is assigned to you' },
              { key: 'emailOnComment', label: 'New comments', desc: 'Email when someone comments on your task' },
              { key: 'emailOnDeadline', label: 'Upcoming deadlines', desc: 'Email reminder 24h before task due date' },
              { key: 'inAppNotifications', label: 'In-app notifications', desc: 'Show notifications inside the app' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <button onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                  className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${prefs[key] ? 'bg-brand-600' : 'bg-gray-200'}`}
                  style={{ width: 40, height: 22 }}>
                  <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform duration-200
                    ${prefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`}
                    style={{ width: 18, height: 18, top: 2, left: prefs[key] ? 18 : 2 }} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={handlePrefSave} disabled={saving} className="btn-primary mt-5 gap-2">
            <Save size={13} /> {saving ? 'Saving...' : 'Save preferences'}
          </button>
        </div>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Security</h2>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-medium text-amber-800">Password</p>
              <p className="text-xs text-amber-600 mt-0.5 mb-3">Use the forgot password flow to change your password securely.</p>
              <a href="/forgot-password" className="btn-secondary text-xs py-1.5">Reset password →</a>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-sm font-medium text-gray-800">Active sessions</p>
              <p className="text-xs text-gray-500 mt-0.5">You can have up to 5 active sessions across devices. Logging out invalidates the current session token.</p>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
