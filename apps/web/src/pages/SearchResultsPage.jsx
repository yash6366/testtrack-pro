import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const projectId = searchParams.get('projectId');
  const query = searchParams.get('q');

  const [results, setResults] = useState({
    testCases: [],
    bugs: [],
    executions: [],
    suites: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (query && projectId) {
      searchContent();
    }
  }, [query, projectId]);

  const searchContent = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(
        `/api/search?projectId=${projectId}&q=${encodeURIComponent(query)}`
      );
      setResults({
        testCases: response.testCases || [],
        bugs: response.bugs || [],
        executions: response.executions || [],
        suites: response.suites || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to search');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = results.testCases.length +
    results.bugs.length +
    results.executions.length +
    results.suites.length;

  const renderTestCaseResult = (tc) => (
    <div
      key={tc.id}
      className="p-4 border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] cursor-pointer transition"
      onClick={() => navigate(`/test-cases/${tc.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--foreground)]">{tc.title}</h4>
          <p className="text-sm text-[var(--muted)] mt-1">{tc.description}</p>
        </div>
        <span className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
          tc.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-600 dark:text-red-300' :
          tc.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-300' :
          tc.priority === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-300' :
          'bg-green-500/10 text-green-600 dark:text-green-300'
        }`}>
          {tc.priority}
        </span>
      </div>
    </div>
  );

  const renderBugResult = (bug) => (
    <div
      key={bug.id}
      className="p-4 border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] cursor-pointer transition"
      onClick={() => navigate(`/bugs/${bug.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--foreground)]">{bug.title}</h4>
          <p className="text-sm text-[var(--muted)] mt-1">{bug.description}</p>
        </div>
        <span className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
          bug.status === 'OPEN' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-300' :
          bug.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300' :
          bug.status === 'RESOLVED' ? 'bg-green-500/10 text-green-600 dark:text-green-300' :
          'bg-gray-500/10 text-gray-600 dark:text-gray-300'
        }`}>
          {bug.status}
        </span>
      </div>
    </div>
  );

  const renderExecutionResult = (execution) => (
    <div
      key={execution.id}
      className="p-4 border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] cursor-pointer transition"
      onClick={() => navigate(`/test-execution/${execution.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--foreground)]">
            {execution.testCase?.title || `Execution #${execution.id}`}
          </h4>
          <p className="text-sm text-[var(--muted)] mt-1">
            Executed by {execution.tester?.name || execution.tester?.email || 'Unknown'}
          </p>
        </div>
        <span className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
          execution.status === 'PASSED' ? 'bg-green-500/10 text-green-600 dark:text-green-300' :
          execution.status === 'FAILED' ? 'bg-red-500/10 text-red-600 dark:text-red-300' :
          'bg-gray-500/10 text-gray-600 dark:text-gray-300'
        }`}>
          {execution.status}
        </span>
      </div>
    </div>
  );

  const renderSuiteResult = (suite) => (
    <div
      key={suite.id}
      className="p-4 border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] cursor-pointer transition"
      onClick={() => navigate(`/test-suites/${suite.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--foreground)]">{suite.name}</h4>
          <p className="text-sm text-[var(--muted)] mt-1">
            {suite.testCases?.length || 0} test cases
          </p>
        </div>
      </div>
    </div>
  );

  if (!query || !projectId) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Search"
        headerTitle="Search"
      >
        <div className="p-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            ← Back to Dashboard
          </button>
          <div className="text-center py-12">
            <p className="text-[var(--muted)]">Enter a search query to begin</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Search"
        headerTitle="Searching..."
      >
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Search"
      headerTitle={`Search Results for "${query}"`}
      headerSubtitle={`Found ${totalCount} result${totalCount !== 1 ? 's' : ''}`}
    >
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-600 hover:text-gray-900 mb-4 text-sm"
        >
          ← Back to Dashboard
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* No Results */}
        {totalCount === 0 ? (
          <div className="tt-card p-12 text-center">
            <p className="text-lg text-[var(--muted)]">
              No results found for "{query}"
            </p>
            <p className="text-sm text-[var(--muted)] mt-2">
              Try searching with different keywords
            </p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="border-b border-[var(--border)] flex gap-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-3 font-medium border-b-2 transition ${
                  activeTab === 'all'
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                All ({totalCount})
              </button>
              {results.testCases.length > 0 && (
                <button
                  onClick={() => setActiveTab('testCases')}
                  className={`px-6 py-3 font-medium border-b-2 transition ${
                    activeTab === 'testCases'
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Test Cases ({results.testCases.length})
                </button>
              )}
              {results.bugs.length > 0 && (
                <button
                  onClick={() => setActiveTab('bugs')}
                  className={`px-6 py-3 font-medium border-b-2 transition ${
                    activeTab === 'bugs'
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Bugs ({results.bugs.length})
                </button>
              )}
              {results.executions.length > 0 && (
                <button
                  onClick={() => setActiveTab('executions')}
                  className={`px-6 py-3 font-medium border-b-2 transition ${
                    activeTab === 'executions'
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Executions ({results.executions.length})
                </button>
              )}
              {results.suites.length > 0 && (
                <button
                  onClick={() => setActiveTab('suites')}
                  className={`px-6 py-3 font-medium border-b-2 transition ${
                    activeTab === 'suites'
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Suites ({results.suites.length})
                </button>
              )}
            </div>

            {/* Results */}
            <div className="space-y-4">
              {(activeTab === 'all' || activeTab === 'testCases') && results.testCases.length > 0 && (
                <>
                  {activeTab === 'all' && (
                    <h3 className="text-lg font-semibold mt-6 mb-4">Test Cases</h3>
                  )}
                  <div className="space-y-3">
                    {results.testCases.map(renderTestCaseResult)}
                  </div>
                </>
              )}

              {(activeTab === 'all' || activeTab === 'bugs') && results.bugs.length > 0 && (
                <>
                  {activeTab === 'all' && (
                    <h3 className="text-lg font-semibold mt-6 mb-4">Bugs</h3>
                  )}
                  <div className="space-y-3">
                    {results.bugs.map(renderBugResult)}
                  </div>
                </>
              )}

              {(activeTab === 'all' || activeTab === 'executions') && results.executions.length > 0 && (
                <>
                  {activeTab === 'all' && (
                    <h3 className="text-lg font-semibold mt-6 mb-4">Executions</h3>
                  )}
                  <div className="space-y-3">
                    {results.executions.map(renderExecutionResult)}
                  </div>
                </>
              )}

              {(activeTab === 'all' || activeTab === 'suites') && results.suites.length > 0 && (
                <>
                  {activeTab === 'all' && (
                    <h3 className="text-lg font-semibold mt-6 mb-4">Test Suites</h3>
                  )}
                  <div className="space-y-3">
                    {results.suites.map(renderSuiteResult)}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
