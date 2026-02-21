import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import NotificationPreferences from '../components/NotificationPreferences';
import DashboardLayout from '../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/ui/BackButton';

export default function NotificationsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('preferences');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Notification Settings"
      headerTitle="Notifications"
      headerSubtitle="Manage your notification preferences and view notification history"
      onLogout={handleLogout}
    >
      <div className="mb-4">
        <BackButton label="Back to Dashboard" fallback="/dashboard" />
      </div>

      <div className="tt-card">
        {/* Tabs */}
        <div className="border-b border-[var(--border)] px-6 pt-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('preferences')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preferences'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Preferences
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'preferences' && <NotificationPreferences />}
        </div>
      </div>
    </DashboardLayout>
  );
}
