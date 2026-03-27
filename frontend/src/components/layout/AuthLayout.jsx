import { Outlet } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-md">
            <FolderKanban size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Coordo</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <Outlet />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          AI-enhanced project management for modern teams
        </p>
      </div>
    </div>
  );
}
