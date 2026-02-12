import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';

export default function TestSuiteDetailPage() {
  const { suiteId } = useParams();
  const navigate = useNavigate();
  const suiteIdNumber = Number(suiteId);
  const isValidSuiteId = Number.isFinite(suiteIdNumber) && suiteIdNumber > 0;

  const [suite, setSuite] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('testcases'); // 'testcases', 'history', 'details'

  useEffect(() => {
    if (!isValidSuiteId) {
      setError('Invalid test suite id');
      setLoading(false);
      return;
    }

    loadSuiteDetails();
    loadTestCases();
    loadExecutionHistory();
  }, [suiteId]);

  const loadSuiteDetails = async () => {
    try {
      const response = await apiClient.get(`/api/test-suites/${suiteIdNumber}`);
      setSuite(response);
    } catch (err) {
      setError(err.message || 'Failed to load suite details');
    } finally {
      setLoading(false);
    }
  };

  const loadTestCases = async () => {
    try {
      const response = await apiClient.get(`/api/test-suites/${suiteIdNumber}/test-cases`);
      setTestCases(response);
    } catch (err) {
      console.error('Failed to load test cases:', err);
    }
  };

  const loadExecutionHistory = async () => {
    try {
      const response = await apiClient.get(`/api/test-suites/${suiteIdNumber}/runs?limit=5`);
      setExecutionHistory(response);
    } catch (err) {
      console.error('Failed to load execution history:', err);
    }
  };

  const handleExecuteSuite = async () => {
    const environment = prompt('Enter environment (DEVELOPMENT/STAGING/UAT/PRODUCTION):', 'STAGING');
    if (environment) {
      try {
        const response = await apiClient.post(`/api/test-suites/${suiteIdNumber}/execute`, {
          environment,
          executeChildSuites: true,
        });
        alert(`Suite execution started. Run ID: ${response.id}`);
        navigate(`/suite-runs/${response.id}`);
      } catch (err) {
        alert(`Failed to execute suite: ${err.message}`);
      }
    }
  };

  const handleAddTestCases = async () => {
    const testCaseIds = prompt('Enter test case IDs (comma-separated):');
    if (testCaseIds) {
      try {
        const ids = testCaseIds.split(',').map(id => parseInt(id.trim()));
        await apiClient.post(`/api/test-suites/${suiteIdNumber}/test-cases`, { testCaseIds: ids });
        alert('Test cases added successfully');
        loadTestCases();
      } catch (err) {
        alert(`Failed to add test cases: ${err.message}`);
      }
    }
  };

  const handleRemoveTestCase = async (testCaseId) => {
    if (confirm('Remove this test case from suite?')) {
      try {
        await apiClient.delete(`/api/test-suites/${suiteIdNumber}/test-cases/${testCaseId}`);
        loadTestCases();
      } catch (err) {
        alert(`Failed to remove test case: ${err.message}`);
      }
    }
  };

  const handleEditSuite = () => {
    navigate(`/test-suites/${suiteIdNumber}/edit`);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !suite) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
          {error || 'Suite not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/test-suites')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">{suite.name}</h1>
            <span className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-800">
              {suite.type}
            </span>
            <span className="px-3 py-1 text-sm rounded bg-green-100 text-green-800">
              {suite.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExecuteSuite}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={suite.isArchived}
            >
              ▶ Execute Suite
            </button>
            <button
              onClick={handleEditSuite}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit
            </button>
          </div>
        </div>
        
        {suite.description && (
          <p className="text-gray-600 dark:text-gray-400">{suite.description}</p>
        )}

        <div className="flex gap-6 mt-4 text-sm text-gray-600">
          <span>📝 {suite._count.testCases} test cases</span>
          <span>📂 {suite._count.childSuites || 0} child suites</span>
          <span>🔄 {suite._count.suiteRuns} executions</span>
          {suite.estimatedDurationMinutes && (
            <span>⏱️ Est. {suite.estimatedDurationMinutes}min</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-4">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('testcases')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'testcases'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent'
            }`}
          >
            Test Cases ({testCases.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent'
            }`}
          >
            Execution History
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent'
            }`}
          >
            Details
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'testcases' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Test Cases</h2>
            <button
              onClick={handleAddTestCases}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Test Cases
            </button>
          </div>

          {testCases.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded">
              <p className="text-gray-500 mb-4">No test cases in this suite</p>
              <button
                onClick={handleAddTestCases}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Test Cases
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Order
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Test Case
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Priority
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {testCases.map((tc) => (
                    <tr key={tc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2 text-sm">{tc.executionOrder}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{tc.testCase?.name || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {tc.testCase?.type || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                          {tc.testCase?.priority || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleRemoveTestCase(tc.testCaseId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Execution History</h2>
          
          {executionHistory.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded">
              <p className="text-gray-500">No execution history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executionHistory.map((run) => (
                <div
                  key={run.id}
                  className="p-4 bg-white dark:bg-gray-900 rounded shadow hover:shadow-md cursor-pointer"
                  onClick={() => navigate(`/suite-runs/${run.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{run.name || `Run #${run.id}`}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                      <div className="flex gap-2 mt-2 text-sm">
                        <span>✅ {run.passedCount} passed</span>
                        <span>❌ {run.failedCount} failed</span>
                        <span>⚠️ {run.blockedCount} blocked</span>
                        <span>⏭️ {run.skippedCount} skipped</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-sm rounded ${
                      run.status === 'PASSED' ? 'bg-green-100 text-green-800' :
                      run.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Suite Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-600">Type</dt>
                <dd className="font-medium">{suite.type}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Status</dt>
                <dd className="font-medium">{suite.status}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Created By</dt>
                <dd className="font-medium">{suite.creator?.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Created At</dt>
                <dd className="font-medium">
                  {new Date(suite.createdAt).toLocaleString()}
                </dd>
              </div>
              {suite.parentSuite && (
                <div>
                  <dt className="text-sm text-gray-600">Parent Suite</dt>
                  <dd className="font-medium">{suite.parentSuite.name}</dd>
                </div>
              )}
            </dl>
          </div>

          {suite.type === 'DYNAMIC' && (
            <div className="bg-white dark:bg-gray-900 rounded shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Dynamic Filter Criteria</h2>
              <dl className="space-y-2">
                {suite.filterTags?.length > 0 && (
                  <div>
                    <dt className="text-sm text-gray-600">Tags</dt>
                    <dd className="flex gap-2 mt-1">
                      {suite.filterTags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800">
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {suite.filterTypes?.length > 0 && (
                  <div>
                    <dt className="text-sm text-gray-600">Types</dt>
                    <dd className="font-medium">{suite.filterTypes.join(', ')}</dd>
                  </div>
                )}
                {suite.filterPriorities?.length > 0 && (
                  <div>
                    <dt className="text-sm text-gray-600">Priorities</dt>
                    <dd className="font-medium">{suite.filterPriorities.join(', ')}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
