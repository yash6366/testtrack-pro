import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { apiClient } from '@/lib/apiClient';
import DashboardLayout from '@/components/DashboardLayout';
import MetricsGrid from '@/components/MetricsGrid';

export default function TesterDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleCreateTestRun = () => {
    const projectId = localStorage.getItem('selectedProjectId');
    if (!projectId) {
      navigate('/dashboard');
      return;
    }
    navigate(`/projects/${projectId}/test-runs/create`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [recentTests, setRecentTests] = useState([]);
  const [testMetrics, setTestMetrics] = useState([
    { label: 'Total Tests', value: '0', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300' },
    { label: 'Passed', value: '0', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
    { label: 'Failed', value: '0', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-300' },
    { label: 'Pass Rate', value: '0%', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-300' },
  ]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      setLoadingData(true);
      setDataError('');

      try {
        const overview = await apiClient.get('/api/tester/overview');

        if (!isActive) {
          return;
        }

        const metrics = overview?.metrics || {};

        setTestMetrics([
          {
            label: 'Total Tests',
            value: String(metrics.totalExecutions ?? 0),
            color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
          },
          {
            label: 'Passed',
            value: String(metrics.passedExecutions ?? 0),
            color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
          },
          {
            label: 'Failed',
            value: String(metrics.failedExecutions ?? 0),
            color: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
          },
          {
            label: 'Pass Rate',
            value: `${Number(metrics.passRate ?? 0).toFixed(1)}%`,
            color: 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
          },
        ]);

        const recentExecutions = overview?.recentExecutions || [];
        const normalizedRecent = recentExecutions.map((execution) => ({
          id: execution.id,
          name: execution.testCase?.name || execution.testRun?.name || 'Test Execution',
          status: execution.status || 'Unknown',
          passRate: null,
          executedAt: execution.completedAt || execution.startedAt || null,
        }));

        setRecentTests(normalizedRecent);
      } catch (error) {
        if (!isActive) {
          return;
        }
        const isForbidden = error && typeof error === 'object' && error.status === 403;
        const message = isForbidden
          ? 'You do not have permission to view tester metrics.'
          : error instanceof Error
          ? error.message
          : 'Failed to load test data';
        setDataError(message);
      } finally {
        if (isActive) {
          setLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      isActive = false;
    };
  }, []);

  const formatDate = (value) => {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString();
  };

  const formatPassRate = (value) => {
    if (typeof value !== 'number') {
      return '-';
    }
    return `${value.toFixed(0)}%`;
  };

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Tester Dashboard"
      headerTitle={`Welcome, ${user.name}!`}
      headerSubtitle="Here's an overview of your testing activities"
      onLogout={handleLogout}
    >
      {dataError && (
        <div className="tt-card-soft border border-[var(--danger)] text-[var(--danger)] px-4 py-3 rounded-xl mb-6">
          {dataError}
        </div>
      )}

      <MetricsGrid metrics={testMetrics} />

      <div className="tt-card mb-8">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-semibold">Recent Test Executions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Test Name</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Status</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Pass Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loadingData && (
                <tr>
                  <td className="px-6 py-6 text-sm text-[var(--muted)]" colSpan={4}>
                    Loading test data...
                  </td>
                </tr>
              )}
              {!loadingData && recentTests.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-sm text-[var(--muted)]" colSpan={4}>
                    No test runs yet.
                  </td>
                </tr>
              )}
              {!loadingData &&
                recentTests.map((test) => (
                  <tr key={test.id} className="hover:bg-[var(--bg-elevated)] transition">
                    <td className="px-6 py-4 text-sm font-medium">{test.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          test.status === 'Passed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                            : test.status === 'Failed'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                        }`}
                      >
                        {test.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--muted)]">{formatDate(test.executedAt)}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatPassRate(test.passRate)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="tt-card p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={handleCreateTestRun}
              className="tt-btn tt-btn-primary w-full py-2 text-sm"
            >
              Execute New Test
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="tt-btn tt-btn-outline w-full py-2 text-sm"
            >
              View Reports & Analytics
            </button>
            <button className="tt-btn tt-btn-outline w-full py-2 text-sm">View Test Cases</button>
          </div>
        </div>

        <div className="tt-card p-6">
          <h3 className="text-lg font-semibold mb-4">User Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Email:</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Role:</span>
              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-300 font-medium px-3 py-1 rounded-full">
                Tester
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Status:</span>
              <span className="text-[var(--success)] font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
