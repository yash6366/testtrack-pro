import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || 'YOUR_GITHUB_CLIENT_ID';

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [integration, setIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [commits, setCommits] = useState([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const projectId = searchParams.get('projectId') || localStorage.getItem('selectedProjectId');

  useEffect(() => {
    loadIntegration();
  }, [projectId]);

  // Handle GitHub OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && projectId) {
      handleGitHubCallback(code);
    }
  }, [searchParams, projectId]);

  const loadIntegration = async () => {
    if (!projectId) {
      setError('No project selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      try {
        const response = await apiClient.get(`/api/projects/${projectId}/github-integration`);
        setIntegration(response);
        setRepoOwner(response.repoOwner || '');
        setRepoName(response.repoName || '');
        setLastSyncTime(response.lastSyncAt);
        
        // Load recent commits
        try {
          const commitsResponse = await apiClient.get(
            `/api/projects/${projectId}/github-integration/commits?limit=10`
          );
          setCommits(commitsResponse || []);
        } catch (err) {
          // Silent fail for commits
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setIntegration(null);
        } else {
          throw err;
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load integration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGitHubAuth = () => {
    if (!projectId) {
      setError('Please select a project before connecting GitHub');
      return;
    }
    
    const redirectUrl = `${window.location.origin}/integrations?projectId=${projectId}`;
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=repo,admin:repo_hook,user:email&state=${Math.random()}`;
    window.location.href = authUrl;
  };

  const handleGitHubCallback = async (code) => {
    try {
      setLoading(true);
      setError('');

      const redirectUrl = `${window.location.origin}/integrations?projectId=${projectId}`;
      const response = await apiClient.post('/api/github/oauth/callback', {
        code,
        projectId,
        redirectUrl
      });

      setIntegration(response.integration);
      
      // Clear code from URL
      navigate(`/integrations?projectId=${projectId}`, { replace: true });
      
      // Show configure modal if repo not set
      if (!response.integration?.repoOwner || !response.integration?.repoName) {
        setShowConfigModal(true);
      }
      
      // Reload integration data
      setTimeout(() => {
        loadIntegration();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to complete GitHub authorization');
      console.error('GitHub callback error:', err);
      
      // Clear code from URL even on error
      navigate(`/integrations?projectId=${projectId}`, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureRepo = async () => {
    if (!repoOwner.trim() || !repoName.trim()) {
      setError('Please enter both owner and repository name');
      return;
    }

    try {
      setConfigLoading(true);
      setError('');

      const response = await apiClient.post(`/api/projects/${projectId}/github-integration`, {
        repoOwner: repoOwner.trim(),
        repoName: repoName.trim(),
        accessToken: integration?.accessToken || '',
        refreshToken: integration?.refreshToken || '',
        tokenExpiresAt: integration?.tokenExpiresAt || null,
      });

      setIntegration(response);
      setShowConfigModal(false);
      
      // Reload integration
      setTimeout(() => {
        loadIntegration();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to configure repository');
      console.error(err);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSyncData = async () => {
    try {
      setSyncProgress(10);
      
      const response = await apiClient.post(
        `/api/projects/${projectId}/github-integration/sync`
      );

      setSyncProgress(100);
      setShowSyncModal(false);
      
      // Show success message
      alert(`Sync complete! Processed ${response.commitsProcessed} commits and ${response.prsProcessed} PRs`);
      
      // Reload integration
      setTimeout(() => {
        loadIntegration();
      }, 500);
    } catch (err) {
      setError(err.message || 'Failed to sync data');
      console.error(err);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('This will disable the GitHub integration. Are you sure?')) return;

    try {
      await apiClient.post(`/api/projects/${projectId}/github-integration/deactivate`);
      setIntegration(null);
      setRepoOwner('');
      setRepoName('');
      setCommits([]);
    } catch (err) {
      setError(err.message || 'Failed to deactivate integration');
      console.error(err);
    }
  };

  const handleDeleteIntegration = async () => {
    if (!confirm('This will permanently delete the GitHub integration. This cannot be undone.')) return;

    try {
      await apiClient.delete(`/api/projects/${projectId}/github-integration`);
      setIntegration(null);
      setRepoOwner('');
      setRepoName('');
      setCommits([]);
    } catch (err) {
      setError(err.message || 'Failed to delete integration');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--border)] border-t-blue-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Integrations</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Connect with external services and tools</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* GitHub Integration Card */}
        <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--card-bg)] mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-black rounded-lg flex items-center justify-center">
                <span className="text-white text-2xl font-bold">GH</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">GitHub</h2>
                <p className="text-[var(--muted-foreground)] text-sm">
                  {integration ? 'Connected' : 'Not Connected'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {integration ? (
                <>
                  <button
                    onClick={() => setShowSyncModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Sync Data
                  </button>
                  <button
                    onClick={handleDeactivate}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Deactivate
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartGitHubAuth}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                >
                  Connect GitHub
                </button>
              )}
            </div>
          </div>

          {integration ? (
            <div className="space-y-6">
              {/* Integration Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--hover-bg)] rounded-lg">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Repository</p>
                  <p className="font-semibold text-[var(--foreground)]">
                    {integration.repoOwner}/{integration.repoName}
                  </p>
                </div>
                <div className="p-4 bg-[var(--hover-bg)] rounded-lg">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">GitHub User</p>
                  <p className="font-semibold text-[var(--foreground)]">{integration.githubUsername}</p>
                </div>
                <div className="p-4 bg-[var(--hover-bg)] rounded-lg">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Status</p>
                  <p className="font-semibold text-green-600">
                    {integration.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="p-4 bg-[var(--hover-bg)] rounded-lg">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Last Synced</p>
                  <p className="font-semibold text-[var(--foreground)]">
                    {lastSyncTime ? new Date(lastSyncTime).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>

              {/* Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">Configuration</h3>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="px-4 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--input-bg)] transition"
                >
                  Edit Repository Details
                </button>
              </div>

              {/* Webhook Status */}
              <div className="p-4 bg-[var(--hover-bg)] rounded-lg border border-[var(--border)]">
                <h3 className="font-semibold text-[var(--foreground)] mb-2">Webhook Status</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {integration.webhookUrl ? (
                    <span className="text-green-600 dark:text-green-400">✓ Webhook configured</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">⚠ Webhook not configured</span>
                  )}
                </p>
              </div>

              {/* Auto-linking Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Auto-linking Features</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>✓ Commit messages are automatically parsed for bug references</li>
                  <li>✓ Supports: Fixes #123, Closes #456, bug: 789, [BUG-123]</li>
                  <li>✓ Pull requests are tracked and linked to issues</li>
                </ul>
              </div>

              {/* Danger Zone */}
              <div className="p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-3">Danger Zone</h3>
                <button
                  onClick={handleDeleteIntegration}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Delete Integration
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-[var(--hover-bg)] rounded-lg text-center">
              <p className="text-[var(--muted-foreground)] mb-4">
                Connect your GitHub repository to enable auto-linking of commits to bugs and test cases.
              </p>
              <button
                onClick={handleStartGitHubAuth}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition"
              >
                Connect GitHub
              </button>
            </div>
          )}
        </div>

        {/* Recent Commits */}
        {commits.length > 0 && (
          <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--card-bg)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Recent Commits</h2>
            <div className="space-y-3">
              {commits.map((commit) => (
                <div key={commit.id} className="p-3 bg-[var(--hover-bg)] rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-mono text-sm text-blue-600 dark:text-blue-400">
                      {commit.commitHash?.substring(0, 7)}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(commit.committedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--foreground)]">{commit.message}</p>
                  {commit.linkedBugIds?.length > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Linked to {commit.linkedBugIds.length} bug(s)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-bg)] rounded-lg p-6 w-96 shadow-lg">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Configure Repository</h2>
            
            <input
              type="text"
              placeholder="Repository Owner (e.g., octocat)"
              value={repoOwner}
              onChange={(e) => setRepoOwner(e.target.value)}
              className="w-full px-3 py-2 mb-3 bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-blue-500"
            />

            <input
              type="text"
              placeholder="Repository Name (e.g., Hello-World)"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              className="w-full px-3 py-2 mb-4 bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-blue-500"
            />

            <div className="flex gap-2">
              <button
                onClick={handleConfigureRepo}
                disabled={configLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
              >
                {configLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-bg)] rounded-lg p-6 w-96 shadow-lg">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Sync GitHub Data</h2>
            <p className="text-[var(--muted-foreground)] text-sm mb-4">
              This will sync recent commits and pull requests from your GitHub repository.
            </p>
            
            {syncProgress > 0 && (
              <div className="mb-4">
                <div className="w-full bg-[var(--hover-bg)] rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSyncData}
                disabled={syncProgress > 0 && syncProgress < 100}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
              >
                {syncProgress === 100 ? 'Done' : syncProgress > 0 ? 'Syncing...' : 'Start Sync'}
              </button>
              <button
                onClick={() => {
                  setShowSyncModal(false);
                  setSyncProgress(0);
                }}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
