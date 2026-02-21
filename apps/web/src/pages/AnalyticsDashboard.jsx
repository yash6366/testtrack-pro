import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { useProject } from '@/hooks';
import { apiClient } from '@/lib/apiClient';
import DashboardLayout from '@/components/DashboardLayout';
import MetricsGrid from '@/components/MetricsGrid';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import BackButton from '@/components/ui/BackButton';
import {
  ExecutionTrendChart,
  BugTrendChart,
  BugDistributionChart,
  TeamComparisonChart,
} from '@/components/charts';
import { FolderKanban } from 'lucide-react';

export default function AnalyticsDashboard() {
  const { projectId: routeProjectId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedProjectId, setActiveProjectId, loading: projectLoading } = useProject();
  const projectId = routeProjectId || selectedProjectId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Analytics data
  const [executionTrend, setExecutionTrend] = useState(null);
  const [bugTrend, setBugTrend] = useState(null);
  const [bugAge, setBugAge] = useState(null);
  const [execSpeed, setExecSpeed] = useState(null);
  const [flakyTests, setFlakyTests] = useState(null);
  const [testerComparison, setTesterComparison] = useState(null);

  // Summary metrics
  const [metrics, setMetrics] = useState([
    { label: 'Total Tests', value: '0', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300' },
    { label: 'Pass Rate', value: '0%', color: 'bg-green-500/10 text-green-600 dark:text-green-300' },
    { label: 'Open Bugs', value: '0', color: 'bg-red-500/10 text-red-600 dark:text-red-300' },
    { label: 'Defect Density', value: '0', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-300' },
  ]);

  useEffect(() => {
    if (routeProjectId) {
      setActiveProjectId(routeProjectId);
    }
  }, [routeProjectId, setActiveProjectId]);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    loadAnalytics();
  }, [projectId]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const [execTrend, bugT, bugA, execS, flaky, testerComp] = await Promise.all([
        apiClient.get(`/api/projects/${projectId}/analytics/execution-trend?weeks=8`),
        apiClient.get(`/api/projects/${projectId}/analytics/bug-trend?weeks=8`),
        apiClient.get(`/api/projects/${projectId}/analytics/bug-age`),
        apiClient.get(`/api/projects/${projectId}/analytics/execution-speed?days=30`),
        apiClient.get(`/api/projects/${projectId}/analytics/flaky-tests?runsThreshold=5`),
        apiClient.get(`/api/projects/${projectId}/analytics/tester-comparison?weeks=4`),
      ]);

      setExecutionTrend(execTrend?.data || []);
      setBugTrend(bugT?.data || []);
      setBugAge(bugA);
      setExecSpeed(execS);
      setFlakyTests(flaky?.tests || []);
      setTesterComparison(testerComp || []);

      // Update summary metrics
      if (execTrend?.data && execTrend.data.length > 0) {
        const latestWeek = execTrend.data[execTrend.data.length - 1];
        setMetrics([
          {
            label: 'Total Tests',
            value: String(latestWeek.total || 0),
            color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
          },
          {
            label: 'Pass Rate',
            value: `${latestWeek.passRate || 0}%`,
            color: 'bg-green-500/10 text-green-600 dark:text-green-300',
          },
          {
            label: 'Open Bugs',
            value: String(bugA?.totalOpen || 0),
            color: 'bg-red-500/10 text-red-600 dark:text-red-300',
          },
          {
            label: 'Defect Density',
            value: (bugA?.overallDensity || 0).toFixed(2),
            color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-300',
          },
        ]);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (projectLoading) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Analytics Dashboard"
        headerTitle="Loading analytics..."
        onLogout={handleLogout}
      >
        <LoadingState className="py-12" message="Loading projects..." />
      </DashboardLayout>
    );
  }

  if (!projectId) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Analytics Dashboard"
        headerTitle="Project Analytics & Insights"
        onLogout={handleLogout}
      >
        <div className="max-w-3xl">
          <div className="mb-4">
            <BackButton label="Back to Dashboard" fallback="/dashboard" />
          </div>
          <EmptyState
            icon={FolderKanban}
            title="No project selected"
            description="Select or create a project to view analytics."
            actionLabel="Select Project"
            onAction={() => navigate('/projects')}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Analytics Dashboard"
        headerTitle="Loading analytics..."
        onLogout={handleLogout}
      >
        <LoadingState className="py-12" message="Loading analytics..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Analytics Dashboard"
        headerTitle="Error Loading Dashboard"
        onLogout={handleLogout}
      >
        <div className="text-center py-12 text-red-600">{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Analytics Dashboard"
      headerTitle="Project Analytics & Insights"
      headerSubtitle="Comprehensive testing metrics and performance analysis"
      onLogout={handleLogout}
    >
      <div className="mb-4">
        <BackButton label="Back to Dashboard" fallback="/dashboard" />
      </div>

      <MetricsGrid metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ExecutionTrendChart data={executionTrend} isLoading={loading} />
        <BugTrendChart data={bugTrend} isLoading={loading} />
      </div>

      {testerComparison && testerComparison.length > 0 && (
        <div className="mb-8">
          <TeamComparisonChart
            data={testerComparison}
            metric="totalExecutions"
            title="Tester Execution Count"
            isLoading={loading}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {bugAge && (
          <div className="tt-card p-6">
            <h3 className="text-lg font-semibold mb-4">Bug Age & SLA Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted)]">Total Open Bugs</span>
                <span className="font-semibold">{bugAge.totalOpen}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted)]">Average Age (days)</span>
                <span className="font-semibold">{bugAge.ageDays?.avg || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted)]">P95 Age (days)</span>
                <span className="font-semibold">{bugAge.ageDays?.p95 || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted)]">SLA Breaches (P0, &gt; 5 days)</span>
                <span className="font-semibold text-red-600">{bugAge.slaBreaches || 0}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted)] font-semibold mb-2">By Priority</p>
                {bugAge.byPriority && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>P0:</span>
                      <span>{bugAge.byPriority.p0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>P1:</span>
                      <span>{bugAge.byPriority.p1}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>P2:</span>
                      <span>{bugAge.byPriority.p2}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>P3:</span>
                      <span>{bugAge.byPriority.p3}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {execSpeed && !execSpeed.noData && (
          <div className="tt-card p-6">
            <h3 className="text-lg font-semibold mb-4">Execution Speed Analysis</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted)]">Total Executions</span>
                <span className="font-semibold">{execSpeed.total?.count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted)]">Average Duration (sec)</span>
                <span className="font-semibold">{execSpeed.total?.avg || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted)]">P50 Duration (sec)</span>
                <span className="font-semibold">{execSpeed.total?.p50 || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted)]">P95 Duration (sec)</span>
                <span className="font-semibold">{execSpeed.total?.p95 || 0}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted)] font-semibold mb-2">By Status</p>
                {execSpeed.byStatus && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Passed:</p>
                      <p className="text-xs text-[var(--muted)]">
                        {execSpeed.byStatus.passed?.count || 0} tests, Avg {execSpeed.byStatus.passed?.avg || 0}s
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Failed:</p>
                      <p className="text-xs text-[var(--muted)]">
                        {execSpeed.byStatus.failed?.count || 0} tests, Avg {execSpeed.byStatus.failed?.avg || 0}s
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {flakyTests && flakyTests.length > 0 && (
        <div className="tt-card p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Flaky Tests Detected</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Test Case</th>
                  <th className="px-4 py-3 text-left font-semibold">Flake Rate</th>
                  <th className="px-4 py-3 text-left font-semibold">Passed</th>
                  <th className="px-4 py-3 text-left font-semibold">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {flakyTests.slice(0, 10).map((test, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-elevated)] transition">
                    <td className="px-4 py-3">{test.testCaseName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-600">
                        {test.flakeRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">{test.passedRuns}</td>
                    <td className="px-4 py-3">{test.failedRuns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={loadAnalytics}
        className="tt-btn tt-btn-primary px-4 py-2 text-sm"
      >
        Refresh Analytics
      </button>
    </DashboardLayout>
  );
}
