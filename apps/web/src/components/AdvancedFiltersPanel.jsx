import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/apiClient';

/**
 * AdvancedFiltersPanel Component
 * Allows users to create, edit, and manage advanced filters for resources
 */
export default function AdvancedFiltersPanel({ resourceType = 'BUG', onFilterSelected = null }) {
  const { user, token } = useAuth();
  const [filters, setFilters] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Filter form state
  const [filterForm, setFilterForm] = useState({
    name: '',
    resourceType,
    status: [],
    priority: [],
    severity: [],
    assigneeId: null,
    tags: [],
    isDefault: false,
    isFavorite: false,
  });

  // Load saved filters
  useEffect(() => {
    if (user) {
      fetchFilters();
    }
  }, [user, resourceType]);

  const fetchFilters = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/notifications/filters?resourceType=${resourceType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFilters(response.data.filters || []);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFilter = async () => {
    if (!filterForm.name.trim()) {
      alert('Filter name is required');
      return;
    }

    try {
      const filterConfig = {
        status: filterForm.status,
        priority: filterForm.priority,
        severity: filterForm.severity,
        assigneeId: filterForm.assigneeId,
        tags: filterForm.tags,
      };

      if (editingId) {
        // Update existing filter
        await apiClient.patch(
          `/notifications/filters/${editingId}`,
          {
            name: filterForm.name,
            filterConfig: JSON.stringify(filterConfig),
            isDefault: filterForm.isDefault,
            isFavorite: filterForm.isFavorite,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new filter
        await apiClient.post(
          '/notifications/filters',
          {
            name: filterForm.name,
            resourceType: filterForm.resourceType,
            filterConfig: JSON.stringify(filterConfig),
            displayColumns: [],
            sortBy: 'createdAt',
            sortOrder: 'desc',
            isDefault: filterForm.isDefault,
            isFavorite: filterForm.isFavorite,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      await fetchFilters();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to save filter:', error);
      alert('Failed to save filter');
    }
  };

  const handleDeleteFilter = async (filterId) => {
    if (!confirm('Delete this filter?')) return;

    try {
      await apiClient.delete(`/notifications/filters/${filterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchFilters();
    } catch (error) {
      console.error('Failed to delete filter:', error);
      alert('Failed to delete filter');
    }
  };

  const handleEditFilter = (filter) => {
    const config = typeof filter.filterConfig === 'string' ? JSON.parse(filter.filterConfig) : filter.filterConfig;
    setFilterForm({
      name: filter.name,
      resourceType: filter.resourceType,
      status: config.status || [],
      priority: config.priority || [],
      severity: config.severity || [],
      assigneeId: config.assigneeId || null,
      tags: config.tags || [],
      isDefault: filter.isDefault,
      isFavorite: filter.isFavorite,
    });
    setEditingId(filter.id);
    setShowForm(true);
  };

  const handleSelectFilter = (filter) => {
    if (onFilterSelected) {
      onFilterSelected(filter);
    }
  };

  const resetForm = () => {
    setFilterForm({
      name: '',
      resourceType,
      status: [],
      priority: [],
      severity: [],
      assigneeId: null,
      tags: [],
      isDefault: false,
      isFavorite: false,
    });
    setEditingId(null);
  };

  const statuses = {
    BUG: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'FIXED', 'VERIFIED_FIXED', 'REOPENED', 'CLOSED'],
    TEST_CASE: ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'],
  };

  const priorities = ['P0', 'P1', 'P2', 'P3', 'P4'];
  const severities = ['CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'];

  return (
    <div className="inline-block relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border)]"
      >
        <span>⚙️</span>
        <span>Filters</span>
        {filters.length > 0 && <span className="text-xs bg-[var(--primary)] text-white rounded-full px-2 py-0.5">{filters.length}</span>}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-[var(--border)] z-40">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-[var(--text)]">Saved Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            {showForm ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Filter name"
                  value={filterForm.name}
                  onChange={(e) => setFilterForm({ ...filterForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-[var(--border)] text-sm"
                />

                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">Status</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {statuses[filterForm.resourceType]?.map(status => (
                      <button
                        key={status}
                        onClick={() =>
                          setFilterForm({
                            ...filterForm,
                            status: filterForm.status.includes(status)
                              ? filterForm.status.filter(s => s !== status)
                              : [...filterForm.status, status],
                          })
                        }
                        className={`px-2 py-1 text-xs rounded ${
                          filterForm.status.includes(status)
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--bg-elevated)] text-[var(--text)]'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">Priority</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {priorities.map(priority => (
                      <button
                        key={priority}
                        onClick={() =>
                          setFilterForm({
                            ...filterForm,
                            priority: filterForm.priority.includes(priority)
                              ? filterForm.priority.filter(p => p !== priority)
                              : [...filterForm.priority, priority],
                          })
                        }
                        className={`px-2 py-1 text-xs rounded ${
                          filterForm.priority.includes(priority)
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--bg-elevated)] text-[var(--text)]'
                        }`}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">Severity</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {severities.map(severity => (
                      <button
                        key={severity}
                        onClick={() =>
                          setFilterForm({
                            ...filterForm,
                            severity: filterForm.severity.includes(severity)
                              ? filterForm.severity.filter(s => s !== severity)
                              : [...filterForm.severity, severity],
                          })
                        }
                        className={`px-2 py-1 text-xs rounded ${
                          filterForm.severity.includes(severity)
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--bg-elevated)] text-[var(--text)]'
                        }`}
                      >
                        {severity}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filterForm.isFavorite}
                    onChange={(e) => setFilterForm({ ...filterForm, isFavorite: e.target.checked })}
                  />
                  <span className="text-sm">Mark as favorite</span>
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveFilter}
                    className="flex-1 px-3 py-2 bg-[var(--primary)] text-white rounded text-sm font-semibold hover:opacity-90"
                  >
                    Save Filter
                  </button>
                  <button
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {loading ? (
                  <p className="text-center text-[var(--muted)] py-4">Loading filters...</p>
                ) : filters.length > 0 ? (
                  <div className="space-y-2">
                    {filters.map(filter => (
                      <div
                        key={filter.id}
                        className="p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] cursor-pointer transition"
                      >
                        <div
                          onClick={() => handleSelectFilter(filter)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {filter.isFavorite && <span>⭐</span>}
                            <div>
                              <p className="font-semibold text-sm text-[var(--text)]">{filter.name}</p>
                              <p className="text-xs text-[var(--muted)]">
                                {filter.usageCount} uses {filter.lastUsedAt && `• Last used: ${new Date(filter.lastUsedAt).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditFilter(filter);
                            }}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFilter(filter.id);
                            }}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[var(--muted)] py-4">No saved filters</p>
                )}

                <button
                  onClick={() => setShowForm(true)}
                  className="w-full mt-4 px-3 py-2 bg-[var(--primary)] text-white rounded text-sm font-semibold hover:opacity-90"
                >
                  + New Filter
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
