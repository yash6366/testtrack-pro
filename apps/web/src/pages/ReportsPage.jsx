import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/apiClient';
import { useProject } from '../hooks/useProject';
import EmptyState from '@/components/common/EmptyState';
import LoadingState from '@/components/common/LoadingState';
import { FolderKanban } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    projects,
    selectedProject,
    selectedProjectId,
    setActiveProjectId,
    loading: projectLoading,
  } = useProject();
  
  const [testRuns, setTestRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [report, setReport] = useState(null);
  const [performanceReport, setPerformanceReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [perfLoading, setPerfLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('execution'); // 'execution' or 'performance'

  const resolveProjectId = () => selectedProject?.id || selectedProjectId;

  const handleCreateTestRun = () => {
    const projectId = resolveProjectId();
    if (!projectId) {
      setError('No project selected. Please select a project and try again.');
      return;
    }
    navigate(`/projects/${projectId}/test-runs/create`);
  };

  useEffect(() => {
    loadPerformanceReport();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTestRuns(selectedProject);
      return;
    }
    if (selectedProjectId) {
      loadTestRuns({ id: selectedProjectId });
    }
  }, [selectedProject, selectedProjectId]);

  const loadTestRuns = async (project) => {
    try {
      setLoading(true);
      setError('');
      setTestRuns([]);
      setSelectedRun(null);
      setReport(null);

      const projectId = project?.id;
      if (!projectId) {
        return;
      }

      const response = await apiClient.get(`/api/projects/${projectId}/test-runs`);
      setTestRuns(response.testRuns || []);
      
      if (!response.testRuns || response.testRuns.length === 0) {
        setError('No test runs found for this project. Execute a test run to generate reports.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load test runs');
    } finally {
      setLoading(false);
    }
  };

  const loadTestRunReport = async (runId) => {
    try {
      setReportLoading(true);
      setReport(null);
      setSelectedRun(runId);

      const response = await apiClient.get(`/api/test-runs/${runId}/report`);
      setReport(response);
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  const loadPerformanceReport = async () => {
    try {
      setPerfLoading(true);
      // Use role-specific endpoint
      const endpoint = user?.role === 'DEVELOPER' 
        ? '/api/developer/reports/performance'
        : '/api/tester/reports/performance';
      const response = await apiClient.get(endpoint);
      setPerformanceReport(response);
    } catch (err) {
      console.error('Failed to load performance report:', err);
    } finally {
      setPerfLoading(false);
    }
  };

  const handleExport = async (runId, format) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBaseUrl}/api/test-runs/${runId}/export/${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const extension = format === 'excel' ? 'xlsx' : format;
      a.download = `test-run-${runId}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Failed to export: ${err.message}`);
    }
  };

  const handleExportPerformance = async (format) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBaseUrl}/api/tester/reports/performance/${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      a.download = `performance-report.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Failed to export: ${err.message}`);
    }
  };

  if (projectLoading) {
    return <LoadingState className="min-h-screen" message="Loading projects..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <BackButton label="Back to Dashboard" fallback="/dashboard" />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Generate and export test execution and performance reports
            </p>
          </div>
        </div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Select Project
            </label>
            <select
              value={selectedProject?.id || selectedProjectId || ''}
              onChange={(e) => {
                const projectId = Number(e.target.value);
                const project = projects.find(p => p.id === projectId);
                if (project) {
                  setActiveProjectId(projectId);
                }
              }}
              className="w-full max-w-sm px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Choose a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b mb-6">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('execution')}
              className={`px-4 py-2 border-b-2 ${
                activeTab === 'execution'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
              disabled={!selectedProjectId && activeTab === 'execution'}
            >
              Test Execution Reports
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-4 py-2 border-b-2 ${
                activeTab === 'performance'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
            >
              Tester Performance
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 px-4 py-3 rounded">
          <p className="font-medium">{error}</p>
          {error.includes('No test runs') && (
            <p className="text-sm mt-2">
              Execute a test to generate reports. Go to <button onClick={handleCreateTestRun} className="underline font-medium hover:text-blue-600">Create Test Run</button>.
            </p>
          )}
        </div>
      )}

      {/* No Project Selected Alert */}
      {!selectedProjectId && !error && (
        <div className="mb-6">
          <EmptyState
            icon={FolderKanban}
            title="No project selected"
            description="Select or create a project to view reports and analytics."
            actionLabel="Select Project"
            onAction={() => navigate('/projects')}
          />
        </div>
      )}

      {/* Execution Reports Tab */}
      {activeTab === 'execution' && !selectedProjectId && (
        <div className="bg-white dark:bg-gray-900 rounded shadow p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">Select a Project</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please select a project from the dropdown above to view and analyze test reports.
          </p>
        </div>
      )}

      {/* Execution Reports Tab */}
      {activeTab === 'execution' && selectedProjectId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Runs List */}
          <div className="bg-white dark:bg-gray-900 rounded shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Test Runs</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : testRuns.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-4xl mb-2">🧪</div>
                  <p className="text-gray-500 mb-4">No test runs yet</p>
                  <button 
                    onClick={handleCreateTestRun}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Create Test Run
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {testRuns.map((run) => (
                    <div
                      key={run.id}
                      onClick={() => loadTestRunReport(run.id)}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                        selectedRun === run.id ? 'bg-blue-50 dark:bg-blue-900' : ''
                      }`}
                    >
                      <div className="font-medium">{run.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(run.createdAt).toLocaleDateString()} • {run.status}
                      </div>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="text-green-600">✓ {run.passedCount}</span>
                        <span className="text-red-600">✗ {run.failedCount}</span>
                        <span className="text-yellow-600">⚠ {run.blockedCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Report Details */}
          <div className="bg-white dark:bg-gray-900 rounded shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Report Details</h2>
            </div>
            <div className="p-6">
              {reportLoading ? (
                <div className="text-center py-8 text-gray-500">Loading report...</div>
              ) : !report ? (
                <div className="text-center py-8 text-gray-500">
                  Select a test run to view its report
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <div>
                    <h3 className="font-semibold mb-3">Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                        <div className="text-2xl font-bold">{report.summary.totalTestCases}</div>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900 rounded">
                        <div className="text-sm text-green-600">Passed</div>
                        <div className="text-2xl font-bold text-green-600">{report.summary.passed}</div>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-900 rounded">
                        <div className="text-sm text-red-600">Failed</div>
                        <div className="text-2xl font-bold text-red-600">{report.summary.failed}</div>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded">
                        <div className="text-sm text-blue-600">Pass Rate</div>
                        <div className="text-2xl font-bold text-blue-600">{report.summary.passRate}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Test Type Breakdown */}
                  {report.breakdown?.byType && Object.keys(report.breakdown.byType).length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Execution by Test Type</h3>
                      <div className="space-y-2">
                        {Object.entries(report.breakdown.byType).map(([type, stats]) => (
                          <div key={type} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <span className="font-medium">{type}</span>
                            <span className="text-sm">
                              <span className="text-green-600">{stats.passed}</span> / {stats.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failed Tests */}
                  {report.failedTests?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Failed Test Cases ({report.failedTests.length})</h3>
                      <div className="space-y-2">
                        {report.failedTests.slice(0, 5).map((test) => (
                          <div key={test.id} className="p-2 bg-red-50 dark:bg-red-900 rounded text-sm">
                            <div className="font-medium">{test.testCaseName}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {test.priority} • {test.failedSteps} failed steps
                            </div>
                          </div>
                        ))}
                        {report.failedTests.length > 5 && (
                          <div className="text-sm text-gray-500 text-center">
                            +{report.failedTests.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Export Buttons */}
                  <div>
                    <h3 className="font-semibold mb-3">Export Report</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleExport(selectedRun, 'csv')}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        📄 CSV
                      </button>
                      <button
                        onClick={() => handleExport(selectedRun, 'pdf')}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        📕 PDF
                      </button>
                      <button
                        onClick={() => handleExport(selectedRun, 'excel')}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        📊 Excel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Performance Report Tab */}
      {activeTab === 'performance' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Performance Report</h2>
            </div>
            <div className="p-6">
              {perfLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : !performanceReport ? (
                <div className="text-center py-8 text-gray-500">No performance data available</div>
              ) : (
                <div className="space-y-6">
                  {/* Tester Info */}
                  <div>
                    <h3 className="font-semibold mb-3">Tester Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tester</div>
                        <div className="font-medium">{user.name}</div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Report Period</div>
                        <div className="font-medium">
                          {performanceReport.period?.startDate 
                            ? `${new Date(performanceReport.period.startDate).toLocaleDateString()} - ${new Date(performanceReport.period.endDate).toLocaleDateString()}`
                            : 'All Time'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div>
                    <h3 className="font-semibold mb-3">Execution Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded">
                        <div className="text-sm text-blue-600">Total Executions</div>
                        <div className="text-2xl font-bold text-blue-600">{performanceReport?.metrics?.totalExecutions ?? 0}</div>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded">
                        <div className="text-sm text-purple-600">Test Cases Created</div>
                        <div className="text-2xl font-bold text-purple-600">{performanceReport?.metrics?.testCasesCreated ?? 0}</div>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded">
                        <div className="text-sm text-orange-600">Bugs Reported</div>
                        <div className="text-2xl font-bold text-orange-600">{performanceReport?.metrics?.bugsReported ?? 0}</div>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Avg Time (sec)</div>
                        <div className="text-2xl font-bold">{performanceReport?.metrics?.avgExecutionTimeSeconds ? Math.round(performanceReport.metrics.avgExecutionTimeSeconds) : 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Execution Breakdown */}
                  {performanceReport.executionBreakdown && (
                    <div>
                      <h3 className="font-semibold mb-3">Execution Breakdown</h3>
                      <div className="space-y-2">
                        {Object.entries(performanceReport.executionBreakdown).map(([status, count]) => (
                          <div key={status} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <span className="font-medium">{status}</span>
                            <span className="text-sm">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export Buttons */}
                  <div>
                    <h3 className="font-semibold mb-3">Export Performance Report</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleExportPerformance('pdf')}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        📕 Export as PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
