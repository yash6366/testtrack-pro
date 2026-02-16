import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import { FolderKanban } from 'lucide-react';
import { logError } from '../lib/errorLogger';

export default function TestSuitesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'hierarchy'
  
  const projectId = searchParams.get('projectId') || localStorage.getItem('selectedProjectId');
  const type = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSuites();
  }, [projectId, type, status]);

  const loadSuites = async () => {
    if (!projectId) {
      setError('No project selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const query = new URLSearchParams({
        ...(type && { type }),
        ...(status && { status }),
        ...(search && { search }),
      });

      const endpoint = viewMode === 'hierarchy'
        ? `/api/projects/${projectId}/suite-hierarchy`
        : `/api/projects/${projectId}/test-suites?${query}`;

      const response = await apiClient.get(endpoint);
      setSuites(response);
    } catch (err) {
      setError(err.message || 'Failed to load test suites');
      logError(err, 'TestSuitesPage.loadSuites');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuite = () => {
    navigate(`/test-suites/create?projectId=${projectId}`);
  };

  const handleViewSuite = (suiteId) => {
    navigate(`/test-suites/${suiteId}`);
  };

  const handleExecuteSuite = async (suiteId, suiteName) => {
    if (confirm(`Execute suite "${suiteName}"?`)) {
      try {
        const response = await apiClient.post(`/api/test-suites/${suiteId}/execute`, {
          environment: 'STAGING',
          executeChildSuites: true,
        });
        alert(`Suite execution started. Run ID: ${response.id}`);
        navigate(`/suite-runs/${response.id}`);
      } catch (err) {
        alert(`Failed to execute suite: ${err.message}`);
      }
    }
  };

  const handleCloneSuite = async (suiteId, suiteName) => {
    const newName = prompt(`Enter name for cloned suite:`, `${suiteName} (Copy)`);
    if (newName) {
      try {
        await apiClient.post(`/api/test-suites/${suiteId}/clone`, {
          newName,
          includeTestCases: true,
        });
        alert('Suite cloned successfully');
        loadSuites();
      } catch (err) {
        alert(`Failed to clone suite: ${err.message}`);
      }
    }
  };

  const handleArchiveSuite = async (suiteId, suiteName) => {
    if (confirm(`Archive suite "${suiteName}"?`)) {
      try {
        await apiClient.post(`/api/test-suites/${suiteId}/archive`);
        alert('Suite archived successfully');
        loadSuites();
      } catch (err) {
        alert(`Failed to archive suite: ${err.message}`);
      }
    }
  };

  const typeColor = {
    STATIC: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    DYNAMIC: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    REGRESSION: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    SMOKE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    SANITY: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    CUSTOM: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  const statusColor = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    ARCHIVED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    DEPRECATED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const renderSuiteNode = (suite, depth = 0) => {
    const suiteType = suite.type || 'STATIC';
    return (
      <div key={suite.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div className="p-4 border-b hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {suite.children && suite.children.length > 0 && (
                  <span className="text-gray-500">📁</span>
                )}
                <h3
                  className="font-medium text-lg cursor-pointer hover:text-blue-600"
                  onClick={() => handleViewSuite(suite.id)}
                >
                  {suite.name}
                </h3>
                <span className={`px-2 py-1 text-xs rounded ${typeColor[suiteType] || typeColor.CUSTOM}`}>
                  {suiteType}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${statusColor[suite.status]}`}>
                  {suite.status}
                </span>
              </div>
              {suite.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {suite.description}
                </p>
              )}
              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <span>📝 {suite._count?.testCases || 0} test cases</span>
                <span>📂 {suite._count?.childSuites || 0} child suites</span>
                <span>🔄 {suite._count?.runs || 0} runs</span>
              </div>
            </div>
            <div className="flex gap-2">
              {!isAdmin && (
                <button
                  onClick={() => handleExecuteSuite(suite.id, suite.name)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={suite.status === 'ARCHIVED'}
                >
                  Execute
                </button>
              )}
              <button
                onClick={() => handleViewSuite(suite.id)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View
              </button>
              {!isAdmin && (
                <>
                  <button
                    onClick={() => handleCloneSuite(suite.id, suite.name)}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Clone
                  </button>
                  {suite.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleArchiveSuite(suite.id, suite.name)}
                      className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Archive
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {suite.children && suite.children.map((child) => renderSuiteNode(child, depth + 1))}
      </div>
    );
  };

  if (!projectId) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-[var(--surface)] rounded-2xl p-8 border border-[var(--border)] shadow-lg">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-8 h-8 text-[var(--primary)]" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No Project Selected</h2>
            <p className="text-[var(--muted)] mb-6">
              Please select a project from the dropdown in the navigation bar to view test suites.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="tt-btn tt-btn-primary px-6 py-2.5"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Test Suites</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and execute test suite collections
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={handleCreateSuite}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Create Suite
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`px-3 py-1 rounded ${
                viewMode === 'hierarchy'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              Hierarchy View
            </button>
          </div>

          <select
            value={type}
            onChange={(e) => navigate(`/test-suites?projectId=${projectId}&type=${e.target.value}`)}
            className="px-3 py-1 border rounded dark:bg-gray-800"
          >
            <option value="">All Types</option>
            <option value="STATIC">Static</option>
            <option value="DYNAMIC">Dynamic</option>
            <option value="REGRESSION">Regression</option>
            <option value="SMOKE">Smoke</option>
            <option value="SANITY">Sanity</option>
            <option value="CUSTOM">Custom</option>
          </select>

          <select
            value={status}
            onChange={(e) => navigate(`/test-suites?projectId=${projectId}&status=${e.target.value}`)}
            className="px-3 py-1 border rounded dark:bg-gray-800"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="DEPRECATED">Deprecated</option>
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && loadSuites()}
            placeholder="Search suites..."
            className="px-3 py-1 border rounded flex-1 dark:bg-gray-800"
          />
          <button
            onClick={loadSuites}
            className="px-4 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Search
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading test suites...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && !error && suites.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded">
          <p className="text-gray-500 mb-4">No test suites found</p>
          <button
            onClick={handleCreateSuite}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Suite
          </button>
        </div>
      )}

      {!loading && !error && suites.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded shadow">
          {viewMode === 'hierarchy' 
            ? suites.map((suite) => renderSuiteNode(suite))
            : suites.map((suite) => renderSuiteNode(suite, 0))
          }
        </div>
      )}
    </div>
  );
}
