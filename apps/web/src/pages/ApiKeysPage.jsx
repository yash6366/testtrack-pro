import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';

export default function ApiKeysPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const [keyStats, setKeyStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const projectId = searchParams.get('projectId') || localStorage.getItem('selectedProjectId');

  useEffect(() => {
    loadApiKeys();
  }, [projectId, page]);

  const loadApiKeys = async () => {
    if (!projectId) {
      setError('No project selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(
        `/api/projects/${projectId}/api-keys?page=${page}&limit=10&search=${search}`
      );
      setApiKeys(response.data || response || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load API keys');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a key name');
      return;
    }

    try {
      const response = await apiClient.post(`/api/projects/${projectId}/api-keys`, {
        name: newKeyName,
        expiresAt: newKeyExpiry ? new Date(newKeyExpiry).toISOString() : null,
        rateLimit: 1000,
      });

      setGeneratedKey(response.key);
      setShowCreateModal(false);
      setShowKeyModal(true);
      setNewKeyName('');
      setNewKeyExpiry('');
      
      // Reload keys
      setTimeout(() => {
        loadApiKeys();
      }, 500);
    } catch (err) {
      setError(err.message || 'Failed to create API key');
      console.error(err);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    alert('API key copied to clipboard!');
  };

  const handleViewStats = async (keyId) => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/api-keys/${keyId}/stats`);
      setKeyStats(response);
      setSelectedKey(keyId);
    } catch (err) {
      setError(err.message || 'Failed to load key stats');
      console.error(err);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;

    try {
      await apiClient.post(`/api/projects/${projectId}/api-keys/${keyId}/revoke`);
      setApiKeys(apiKeys.map(k => k.id === keyId ? { ...k, isActive: false } : k));
      setSelectedKey(null);
      setKeyStats(null);
    } catch (err) {
      setError(err.message || 'Failed to revoke API key');
      console.error(err);
    }
  };

  const handleRegenerateKey = async (keyId) => {
    if (!confirm('This will invalidate the current key. Generate a new one?')) return;

    try {
      const response = await apiClient.post(
        `/api/projects/${projectId}/api-keys/${keyId}/regenerate`
      );
      setGeneratedKey(response.key);
      setShowKeyModal(true);
      loadApiKeys();
    } catch (err) {
      setError(err.message || 'Failed to regenerate API key');
      console.error(err);
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      await apiClient.delete(`/api/projects/${projectId}/api-keys/${keyId}`);
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
      setSelectedKey(null);
      setKeyStats(null);
    } catch (err) {
      setError(err.message || 'Failed to delete API key');
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

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">API Keys</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            + Generate Key
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[var(--card-bg)] rounded-lg p-6 w-96 shadow-lg">
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Generate API Key</h2>
              
              <input
                type="text"
                placeholder="Key Name (e.g., CI/CD Pipeline)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full px-3 py-2 mb-4 bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-blue-500"
              />

              <label className="block mb-2 text-sm font-medium text-[var(--foreground)]">
                Expiration Date (optional)
              </label>
              <input
                type="date"
                value={newKeyExpiry}
                onChange={(e) => setNewKeyExpiry(e.target.value)}
                className="w-full px-3 py-2 mb-4 bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-blue-500"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleCreateKey}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Generate
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewKeyName('');
                    setNewKeyExpiry('');
                  }}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Key Generated Modal */}
        {showKeyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[var(--card-bg)] rounded-lg p-6 w-96 shadow-lg">
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">API Key Generated</h2>
              <p className="text-[var(--muted-foreground)] text-sm mb-4">
                Save this key in a secure place. You won't be able to see it again.
              </p>
              
              <div className="p-3 bg-[var(--hover-bg)] rounded-lg border border-[var(--border)] mb-4 font-mono text-xs break-all text-[var(--foreground)]">
                {generatedKey}
              </div>

              <button
                onClick={handleCopyKey}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition mb-2"
              >
                Copy to Clipboard
              </button>

              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setGeneratedKey('');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* API Keys Table */}
        <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--card-bg)]">
          <table className="w-full">
            <thead className="bg-[var(--hover-bg)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left p-4 font-semibold text-[var(--foreground)]">Name</th>
                <th className="text-left p-4 font-semibold text-[var(--foreground)]">Status</th>
                <th className="text-left p-4 font-semibold text-[var(--foreground)]">Created</th>
                <th className="text-left p-4 font-semibold text-[var(--foreground)]">Last Used</th>
                <th className="text-left p-4 font-semibold text-[var(--foreground)]">Expires</th>
                <th className="text-center p-4 font-semibold text-[var(--foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-[var(--muted-foreground)]">
                    No API keys yet
                  </td>
                </tr>
              ) : (
                apiKeys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--hover-bg)] transition"
                  >
                    <td className="p-4">
                      <p className="font-semibold text-[var(--foreground)]">{key.name}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          key.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {key.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--muted-foreground)]">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-[var(--muted-foreground)]">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="p-4 text-sm text-[var(--muted-foreground)]">
                      {key.expiresAt
                        ? new Date(key.expiresAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleViewStats(key.id)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium"
                        >
                          Stats
                        </button>
                        {key.isActive && (
                          <>
                            <button
                              onClick={() => handleRegenerateKey(key.id)}
                              className="text-orange-600 hover:text-orange-800 dark:text-orange-400 text-sm font-medium"
                            >
                              Regenerate
                            </button>
                            <button
                              onClick={() => handleRevokeKey(key.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm font-medium"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-[var(--card-bg)] border border-[var(--border)] disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-[var(--muted-foreground)]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded bg-[var(--card-bg)] border border-[var(--border)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Key Stats Panel */}
        {selectedKey && keyStats && (
          <div className="mt-6 border border-[var(--border)] rounded-lg p-4 bg-[var(--card-bg)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Usage Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[var(--hover-bg)] rounded-lg">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Rate Limit</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">{keyStats.rateLimit}</p>
              </div>
              <div className="p-4 bg-[var(--hover-bg)] rounded-lg">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Last Used</p>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {keyStats.lastUsedAt
                    ? new Date(keyStats.lastUsedAt).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
              <div className="p-4 bg-[var(--hover-bg)] rounded-lg">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Status</p>
                <p className="text-sm font-semibold text-green-600">
                  {keyStats.isActive ? 'Active' : 'Revoked'}
                </p>
              </div>
              <div className="p-4 bg-[var(--hover-bg)] rounded-lg">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Days Until Expiry</p>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {keyStats.daysUntilExpiry ?? 'Never'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
