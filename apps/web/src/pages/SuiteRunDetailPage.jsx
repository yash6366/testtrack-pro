import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import BackButton from '@/components/ui/BackButton';
import Breadcrumb from '@/components/ui/Breadcrumb';

export default function SuiteRunDetailPage() {
  const { suiteRunId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSuiteRunReport();
  }, [suiteRunId]);

  const loadSuiteRunReport = async () => {
    try {
      const response = await apiClient.get(`/api/suite-runs/${suiteRunId}/report`);
      setReport(response);
    } catch (err) {
      setError(err.message || 'Failed to load suite run report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
          {error || 'Suite run not found'}
        </div>
      </div>
    );
  }

  const passRate = parseFloat(report.passRate) || 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 mb-2">
          <BackButton
            label="Back to Test Suites"
            fallback={report?.suite?.id ? `/test-suites/${report.suite.id}` : '/test-suites'}
          />
          <Breadcrumb
            crumbs={[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Test Suites', path: '/test-suites' },
              report?.suite?.id
                ? { label: report.suite.name || 'Suite', path: `/test-suites/${report.suite.id}` }
                : { label: 'Suite', path: null },
              { label: report?.name || `Suite Run #${report?.id}`, path: null },
            ]}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{report.name || `Suite Run #${report.id}`}</h1>
            <p className="text-gray-600">{report.suite.name}</p>
          </div>
          <span className={`px-4 py-2 text-lg rounded font-medium ${
            report.status === 'PASSED' ? 'bg-green-100 text-green-800' :
            report.status === 'FAILED' ? 'bg-red-100 text-red-800' :
            report.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {report.status}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded shadow p-4">
          <div className="text-sm text-gray-600">Pass Rate</div>
          <div className="text-3xl font-bold mt-2">{passRate.toFixed(1)}%</div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${passRate}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded shadow p-4">
          <div className="text-sm text-gray-600">Total Tests</div>
          <div className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
            {report.summary.total}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Executed: {report.summary.executed}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded shadow p-4">
          <div className="text-sm text-gray-600">Duration</div>
          <div className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
            {report.duration ? Math.floor(report.duration / 60) : 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">minutes</div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded shadow p-4">
          <div className="text-sm text-gray-600">Defects Found</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {report.summary.defectCount}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Failed: {report.summary.failed}
          </div>
        </div>
      </div>

      {/* Execution Breakdown */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900 rounded shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-800 dark:text-green-200">
            {report.summary.passed}
          </div>
          <div className="text-sm text-green-600 dark:text-green-300">Passed</div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900 rounded shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-800 dark:text-red-200">
            {report.summary.failed}
          </div>
          <div className="text-sm text-red-600 dark:text-red-300">Failed</div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900 rounded shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
            {report.summary.blocked}
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-300">Blocked</div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900 rounded shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
            {report.summary.skipped}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-300">Skipped</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            {report.summary.total - report.summary.executed}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Not Run</div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white dark:bg-gray-900 rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Execution Details</h2>
        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-gray-600">Executed By</dt>
            <dd className="font-medium">{report.executor?.name || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Started At</dt>
            <dd className="font-medium">
              {report.actualStartDate 
                ? new Date(report.actualStartDate).toLocaleString()
                : 'N/A'
              }
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Completed At</dt>
            <dd className="font-medium">
              {report.actualEndDate 
                ? new Date(report.actualEndDate).toLocaleString()
                : 'In Progress'
              }
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Environment</dt>
            <dd className="font-medium">{report.environment || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Build Version</dt>
            <dd className="font-medium">{report.buildVersion || 'N/A'}</dd>
          </div>
        </dl>
      </div>

      {/* Defects */}
      {report.defects && report.defects.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Defects Found</h2>
          <div className="space-y-2">
            {report.defects.map((defect) => (
              <div
                key={defect.id}
                className="p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => navigate(`/bugs/${defect.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{defect.bugNumber}</span>
                    <span className="ml-2">{defect.title}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                      {defect.severity}
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                      {defect.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Executions by Status */}
      {report.executionsByStatus && (
        <div className="bg-white dark:bg-gray-900 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Test Executions</h2>
          
          {/* Failed Tests */}
          {report.executionsByStatus.FAILED?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-red-600 mb-2">
                Failed Tests ({report.executionsByStatus.FAILED.length})
              </h3>
              <div className="space-y-1">
                {report.executionsByStatus.FAILED.map((exec) => (
                  <div key={exec.id} className="p-2 bg-red-50 dark:bg-red-900 rounded text-sm">
                    <span className="font-medium">{exec.testCase?.name || 'N/A'}</span>
                    <span className="ml-2 text-gray-600">
                      ({exec.testCase?.type} - {exec.testCase?.priority})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocked Tests */}
          {report.executionsByStatus.BLOCKED?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-yellow-600 mb-2">
                Blocked Tests ({report.executionsByStatus.BLOCKED.length})
              </h3>
              <div className="space-y-1">
                {report.executionsByStatus.BLOCKED.map((exec) => (
                  <div key={exec.id} className="p-2 bg-yellow-50 dark:bg-yellow-900 rounded text-sm">
                    <span className="font-medium">{exec.testCase?.name || 'N/A'}</span>
                    <span className="ml-2 text-gray-600">
                      ({exec.testCase?.type} - {exec.testCase?.priority})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passed Tests */}
          {report.executionsByStatus.PASSED?.length > 0 && (
            <div>
              <h3 className="font-medium text-green-600 mb-2">
                Passed Tests ({report.executionsByStatus.PASSED.length})
              </h3>
              <div className="text-sm text-gray-600">
                All {report.executionsByStatus.PASSED.length} tests passed successfully
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
