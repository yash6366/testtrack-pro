import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/apiClient';

/**
 * SavedViewsDashboard Component
 * Displays all saved filters with usage statistics
 */
export default function SavedViewsDashboard() {
  const { user, token } = useAuth();
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user) {
      fetchFilters();
    }
  }, [user]);

  const fetchFilters = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/notifications/filters', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFilters(response.data.filters || []);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (filterId) => {
    try {
      await apiClient.patch(
        `/notifications/filters/${filterId}`,
        { isDefault: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchFilters();
    } catch (error) {
      console.error('Failed to set default filter:', error);
    }
  };

  const handleToggleFavorite = async (filterId) => {
    try {
      const filter = filters.find(f => f.id === filterId);
      await apiClient.patch(
        `/notifications/filters/${filterId}`,
        { isFavorite: !filter.isFavorite },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchFilters();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleSelectFilter = async (filterId) => {
    try {
      await apiClient.patch(
        `/notifications/filters/${filterId}/usage`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Could trigger filtering logic here
    } catch (error) {
      console.error('Failed to track filter usage:', error);
    }
  };

  const filteredList =
    activeTab === 'favorites'
      ? filters.filter(f => f.isFavorite)
      : activeTab === 'default'
      ? filters.filter(f => f.isDefault)
      : filters;

  const statsByType = filters.reduce((acc, filter) => {
    acc[filter.resourceType] = (acc[filter.resourceType] || 0) + 1;
    return acc;
  }, {});

  const topFilters = [...filters]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 5);

  const mostRecentFilters = [...filters]
    .sort((a, b) => new Date(b.lastUsedAt || b.createdAt) - new Date(a.lastUsedAt || a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="tt-card p-4 text-center">
          <p className="text-3xl font-bold text-[var(--primary)]">{filters.length}</p>
          <p className="text-sm text-[var(--muted)] mt-1">Total Filters</p>
        </div>
        <div className="tt-card p-4 text-center">
          <p className="text-3xl font-bold text-amber-500">{filters.filter(f => f.isFavorite).length}</p>
          <p className="text-sm text-[var(--muted)] mt-1">Favorites</p>
        </div>
        <div className="tt-card p-4 text-center">
          <p className="text-3xl font-bold text-blue-500">
            {Math.max(...filters.map(f => f.usageCount || 0), 0)}
          </p>
          <p className="text-sm text-[var(--muted)] mt-1">Max Uses</p>
        </div>
        <div className="tt-card p-4 text-center">
          <p className="text-3xl font-bold text-green-500">{Object.keys(statsByType).length}</p>
          <p className="text-sm text-[var(--muted)] mt-1">Resource Types</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tt-card">
        <div className="border-b border-[var(--border)] p-4 flex gap-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'all'
                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            All Filters
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'favorites'
                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Favorites ({filters.filter(f => f.isFavorite).length})
          </button>
          <button
            onClick={() => setActiveTab('default')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'default'
                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Default
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="text-center text-[var(--muted)] py-8">Loading filters...</p>
          ) : filteredList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--muted)]">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--muted)]">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--muted)]">Uses</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--muted)]">Last Used</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map(filter => (
                    <tr key={filter.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-elevated)]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {filter.isFavorite && <span className="text-amber-500">⭐</span>}
                          {filter.isDefault && <span className="text-blue-500">📌</span>}
                          <span className="font-semibold text-[var(--text)]">{filter.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-[var(--bg-elevated)] px-2 py-1 rounded">
                          {filter.resourceType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--muted)]">{filter.usageCount || 0}</td>
                      <td className="py-3 px-4 text-[var(--muted)]">
                        {filter.lastUsedAt
                          ? new Date(filter.lastUsedAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleSelectFilter(filter.id)}
                            className="text-xs px-2 py-1 bg-[var(--primary)] text-white rounded hover:opacity-90"
                            title="Apply filter"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => handleToggleFavorite(filter.id)}
                            className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                            title={filter.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {filter.isFavorite ? '✓' : '☆'}
                          </button>
                          {!filter.isDefault && (
                            <button
                              onClick={() => handleSetDefault(filter.id)}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              title="Set as default"
                            >
                              Default
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-[var(--muted)] py-8">No saved filters in this category</p>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top Filters */}
        <div className="tt-card p-6">
          <h3 className="font-semibold text-[var(--text)] mb-4">Most Used Filters</h3>
          <div className="space-y-3">
            {topFilters.length > 0 ? (
              topFilters.map((filter, index) => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-[var(--bg-elevated)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[var(--primary)]">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-[var(--text)]">{filter.name}</p>
                      <p className="text-xs text-[var(--muted)]">{filter.resourceType}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-[var(--primary)] text-white rounded text-xs font-semibold">
                    {filter.usageCount || 0}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[var(--muted)] text-sm">No usage data yet</p>
            )}
          </div>
        </div>

        {/* Recently Used */}
        <div className="tt-card p-6">
          <h3 className="font-semibold text-[var(--text)] mb-4">Recently Used</h3>
          <div className="space-y-3">
            {mostRecentFilters.length > 0 ? (
              mostRecentFilters.map(filter => (
                <div key={filter.id} className="p-2 rounded hover:bg-[var(--bg-elevated)]">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[var(--text)]">{filter.name}</p>
                    {filter.isFavorite && <span className="text-amber-500">⭐</span>}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {filter.lastUsedAt
                      ? `${new Date(filter.lastUsedAt).toLocaleDateString()}`
                      : 'Just created'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[var(--muted)] text-sm">No usage history yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
