import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@store/auth.store';
import AppLayout from '@components/layout/AppLayout';
import AuthLayout from '@components/layout/AuthLayout';
import LoginPage from '@pages/auth/LoginPage';
import RegisterPage from '@pages/auth/RegisterPage';
import ForgotPasswordPage from '@pages/auth/ForgotPasswordPage';
import AcceptInvitePage from '@pages/auth/AcceptInvitePage';
import DashboardPage from '@pages/DashboardPage';
import WorkspacePage from '@pages/WorkspacePage';
import ProjectPage from '@pages/ProjectPage';
import KanbanPage from '@pages/KanbanPage';
import SprintsPage from '@pages/SprintsPage';
import CalendarPage from '@pages/CalendarPage';
import FilesPage from '@pages/FilesPage';
import AnalyticsPage from '@pages/AnalyticsPage';
import WikiPage from '@pages/WikiPage';
import SettingsPage from '@pages/SettingsPage';
import NotificationsPage from '@pages/NotificationsPage';
import AIAssistantPage from '@pages/AIAssistantPage';
import MeetingsPage from '@pages/MeetingsPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};
const GuestRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' } }} />
      <Routes>
        <Route element={<GuestRoute><AuthLayout /></GuestRoute>}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
          <Route path="/workspace/:workspaceId/project/:projectId" element={<ProjectPage />}>
            <Route index element={<Navigate to="board" replace />} />
            <Route path="board" element={<KanbanPage />} />
            <Route path="sprints" element={<SprintsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="files" element={<FilesPage />} />
            <Route path="wiki" element={<WikiPage />} />
          </Route>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
