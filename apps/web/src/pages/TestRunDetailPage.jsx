import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';
import { logError } from '../lib/errorLogger';

export default function TestRunDetailPage() {
  const { testRunId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [testRun, setTestRun] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadTestRunDetails();
  }, [testRunId]);

  const loadTestRunDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(`/api/test-runs/${testRunId}`);
      setTestRun(response);
      
      if (response.executions) {
        setExecutions(response.executions);
      }
    } catch (err) {
      setError(err.message || 'Failed to load test run');
      logError(err, 'TestRunDetailPage.loadTestRunDetails');
    } finally {
      setLoading(false);
    }
  };

  const handleViewExecution = (executionId) => {
    navigate(`/test-execution/${executionId}`);
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'PASSED': 'bg-green-500/10 text-green-600 dark:text-green-300',
      'FAILED': 'bg-red-500/10 text-red-600 dark:text-red-300',
      'IN_PROGRESS': 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
      'SKIPPED': 'bg-gray-500/10 text-gray-600 dark:text-gray-300',
      'BLOCKED': 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
    };
    return statusMap[status] || statusMap['SKIPPED'];
  };

  if (loading) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Test Management"
        headerTitle="Test Run Details"
      >
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !testRun) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Test Management"
        headerTitle="Test Run Details"
      >
        <div className="p-6">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            ← Back
          </button>
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!testRun) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Test Management"
        headerTitle="Test Run Details"
      >
        <div className="p-6">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            ← Back
          </button>
          <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded">
            Test run not found
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalTests = executions.length;
  const passedTests = executions.filter(e => e.status === 'PASSED').length;
  const failedTests = executions.filter(e => e.status === 'FAILED').length;
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Test Management"
      headerTitle={testRun.name || `Test Run #${testRun.id}`}
      headerSubtitle={testRun.description || 'Test run details'}
    >
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-900 mb-4 text-sm"
        >
          ← Back
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="tt-card p-4">
            <div className="text-sm text-[var(--muted)]">Total Tests</div>
            <div className="text-3xl font-bold mt-2">{totalTests}</div>
          </div>

          <div className="tt-card p-4">
            <div className="text-sm text-[var(--muted)]">Passed</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{passedTests}</div>
          </div>

          <div className="tt-card p-4">
            <div className="text-sm text-[var(--muted)]">Failed</div>
            <div className="text-3xl font-bold text-red-600 mt-2">{failedTests}</div>
          </div>

          <div className="tt-card p-4">
            <div className="text-sm text-[var(--muted)]">Pass Rate</div>
            <div className="text-3xl font-bold mt-2">{passRate}%</div>
          </div>
        </div>

        {/* Overview Card */}
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-xl font-bold">Test Run Information</h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--muted)]">Name</label>
                <p className="text-lg font-medium mt-1">{testRun.name || '-'}</p>
              </div>

              <div>
                <label className="text-sm text-[var(--muted)]">Status</label>
                <p className="text-lg font-medium mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(testRun.status)}`}>
                    {testRun.status || 'UNKNOWN'}
                  </span>
                </p>
              </div>

              {testRun.createdAt && (
                <div>
                  <label className="text-sm text-[var(--muted)]">Created</label>
                  <p className="text-lg font-medium mt-1">{new Date(testRun.createdAt).toLocaleDateString()}</p>
                </div>
              )}

              {testRun.completedAt && (
                <div>
                  <label className="text-sm text-[var(--muted)]">Completed</label>
                  <p className="text-lg font-medium mt-1">{new Date(testRun.completedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {testRun.description && (
              <div>
                <label className="text-sm text-[var(--muted)]">Description</label>
                <p className="mt-2">{testRun.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Executions Section */}
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-xl font-bold">Test Executions ({totalTests})</h2>
          </div>

          {executions.length === 0 ? (
            <div className="p-6 text-center text-[var(--muted)]">
              No executions found for this test run
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Test Case
                    </th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Tester
                    </th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {executions.map((execution) => (
                    <tr key={execution.id} className="hover:bg-[var(--bg-elevated)] transition">
                      <td className="px-6 py-4 text-sm font-medium">
                        {execution.testCase?.title || `Test #${execution.testCaseId}`}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(execution.status)}`}>
                          {execution.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">
                        {execution.duration ? `${execution.duration}ms` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">
                        {execution.tester?.name || execution.tester?.email || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleViewExecution(execution.id)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
