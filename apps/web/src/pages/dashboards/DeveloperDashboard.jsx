import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import DashboardLayout from '@/components/DashboardLayout';
import MetricsGrid from '@/components/MetricsGrid';
import BugsList from '@/components/BugsList';
import BugDetailsModal from '@/components/BugDetailsModal';
import RequestRetestModal from '@/components/RequestRetestModal';
import DeveloperReports from '@/components/DeveloperReports';
import { BarChart3 } from 'lucide-react';

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedBugId, setSelectedBugId] = useState(null);
  const [showRetestModal, setShowRetestModal] = useState(false);
  const [retestBugId, setRetestBugId] = useState(null);
  const [showReports, setShowReports] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRequestRetest = (bugId) => {
    setRetestBugId(bugId);
    setShowRetestModal(true);
  };

  const handleStatusUpdate = () => {
    // Refresh bug list
    setSelectedBugId(null);
  };

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Developer Dashboard"
      headerTitle={`Welcome, ${user.name}!`}
      headerSubtitle="Manage assigned bugs and fixes"
      onLogout={handleLogout}
    >
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-[var(--border)]">
        <div className="flex gap-4">
          <button
            onClick={() => setShowReports(false)}
            className={`px-4 py-2 font-medium transition ${
              !showReports
                ? 'text-indigo-500 border-b-2 border-indigo-500'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            Bug Management
          </button>
          <button
            onClick={() => setShowReports(true)}
            className={`px-4 py-2 font-medium transition flex items-center gap-2 ${
              showReports
                ? 'text-indigo-500 border-b-2 border-indigo-500'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Reports & Analytics
          </button>
        </div>
      </div>

      {/* Content based on tab */}
      {!showReports ? (
        <>
          {/* Bug Management */}
          <div className="grid grid-cols-1 gap-6 mb-8">
            <BugsList
              onBugSelect={setSelectedBugId}
              onStatusUpdate={handleStatusUpdate}
              onRequestRetest={handleRequestRetest}
            />
          </div>

          {/* Developer Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="tt-card p-6">
              <h3 className="text-lg font-semibold mb-4">Developer Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Email:</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Role:</span>
                  <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-medium px-3 py-1 rounded-full">
                    Developer
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Status:</span>
                  <span className="text-[var(--success)] font-medium">Active</span>
                </div>
              </div>
            </div>

            <div className="tt-card p-6">
              <h3 className="text-lg font-semibold mb-4">Bug Management Tips</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                <li>✓ Click on a bug to view detailed information</li>
                <li>✓ Use filters to find bugs by status or priority</li>
                <li>✓ Update fix documentation when resolving bugs</li>
                <li>✓ Request retest when you mark a bug as Fixed</li>
              </ul>
            </div>

            <div className="tt-card p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    // Filter to show only "IN_PROGRESS" bugs
                  }}
                  className="w-full px-4 py-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 rounded hover:bg-yellow-500/20 transition text-sm font-medium"
                >
                  View In Progress
                </button>
                <button
                  onClick={() => {
                    // Filter to show only "NEW" bugs
                  }}
                  className="w-full px-4 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-300 rounded hover:bg-blue-500/20 transition text-sm font-medium"
                >
                  View New Bugs
                </button>
                <button
                  onClick={() => setShowReports(true)}
                  className="w-full px-4 py-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded hover:bg-indigo-500/20 transition text-sm font-medium flex items-center justify-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <DeveloperReports />
      )}

      {/* Bug Details Modal */}
      {selectedBugId && (
        <BugDetailsModal
          bugId={selectedBugId}
          onClose={() => setSelectedBugId(null)}
          onStatusUpdate={handleStatusUpdate}
          onRequestRetest={handleRequestRetest}
        />
      )}

      {/* Request Retest Modal */}
      {showRetestModal && retestBugId && (
        <RequestRetestModal
          bugId={retestBugId}
          onClose={() => setShowRetestModal(false)}
          onSuccess={() => {
            handleStatusUpdate();
            // Close modal
          }}
        />
      )}
    </DashboardLayout>
  );
}
