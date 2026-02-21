import React, { useState, useEffect } from 'react';
import { useAdminControls } from '@/hooks/useAdminControls';

/**
 * AuditLogViewer - Admin page showing audit log of all admin actions
 * Filters by action type, date range, admin, resource
 */
export default function AuditLogViewer() {
  const { getAuditLog } = useAdminControls();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    startDate: '',
    endDate: '',
  });

  // Pagination
  const [pagination, setPagination] = useState({ skip: 0, take: 50, total: 0 });

  const actionTypes = [
    'MESSAGE_DELETED',
    'USER_MUTED',
    'USER_UNMUTED',
    'CHANNEL_LOCKED',
    'CHANNEL_UNLOCKED',
    'CHAT_DISABLED',
    'CHAT_ENABLED',
  ];

  const resourceTypes = ['MESSAGE', 'USER', 'CHANNEL'];

  const fetchAuditLog = async (skip = 0) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAuditLog(filters, skip, pagination.take);
      setEntries(data.entries || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog(0);
  }, [JSON.stringify(filters)]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePrevious = () => {
    const newSkip = Math.max(0, pagination.skip - pagination.take);
    fetchAuditLog(newSkip);
  };

  const handleNext = () => {
    const newSkip = pagination.skip + pagination.take;
    if (newSkip < pagination.total) {
      fetchAuditLog(newSkip);
    }
  };

  const formatDate = (iso) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'MESSAGE_DELETED':
        return 'bg-red-500/20 text-red-700 dark:text-red-300';
      case 'USER_MUTED':
      case 'USER_UNMUTED':
        return 'bg-orange-500/20 text-orange-700 dark:text-orange-300';
      case 'CHANNEL_LOCKED':
      case 'CHANNEL_UNLOCKED':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'CHAT_DISABLED':
      case 'CHAT_ENABLED':
        return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'MESSAGE_DELETED':
        return '🚫';
      case 'USER_MUTED':
        return '🔇';
      case 'USER_UNMUTED':
        return '🔊';
      case 'CHANNEL_LOCKED':
        return '🔒';
      case 'CHANNEL_UNLOCKED':
        return '🔓';
      case 'CHAT_DISABLED':
        return '⛔';
      case 'CHAT_ENABLED':
        return '✅';
      default:
        return '📝';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--muted-strong)]">📋 Audit Log</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Track all admin actions and changes for compliance and security
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)] space-y-4">
        <h2 className="font-semibold text-[var(--muted-strong)]">Filters</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--muted)]">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="tt-input w-full mt-1 text-sm"
            >
              <option value="">All Actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--muted)]">Resource Type</label>
            <select
              value={filters.resourceType}
              onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              className="tt-input w-full mt-1 text-sm"
            >
              <option value="">All Resources</option>
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--muted)]">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="tt-input w-full mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--muted)]">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="tt-input w-full mt-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-600 p-3 rounded">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-[var(--muted)]">
          <div className="text-center">
            <div className="inline-block animate-spin">⏳</div>
            <div className="mt-2">Loading audit log...</div>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left font-semibold text-[var(--muted-strong)]">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--muted-strong)]">
                  Admin
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--muted-strong)]">
                  Action
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--muted-strong)]">
                  Target
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--muted-strong)]">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="px-4 py-3 text-[var(--muted)] whitespace-nowrap text-xs">
                    {formatDate(entry.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[var(--muted-strong)] font-medium">{entry.user?.name}</div>
                    <div className="text-xs text-[var(--muted)]">{entry.user?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${getActionBadgeColor(
                        entry.action
                      )}`}
                    >
                      <span>{getActionIcon(entry.action)}</span>
                      <span>{entry.action.replace(/_/g, ' ')}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[var(--muted-strong)]">{entry.resourceName}</div>
                    <div className="text-xs text-[var(--muted)]">{entry.resourceType}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)] max-w-xs truncate">
                    {entry.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="flex items-center justify-center py-12 text-[var(--muted)]">
          <div className="text-center">
            <div className="text-3xl mb-2">📋</div>
            <div>No audit log entries found with current filters</div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-[var(--muted)]">
            Showing {pagination.skip + 1} to {Math.min(pagination.skip + pagination.take, pagination.total)} of{' '}
            {pagination.total} entries
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={pagination.skip === 0}
              className="tt-btn px-4 py-2 bg-[var(--border)] hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              disabled={pagination.skip + pagination.take >= pagination.total}
              className="tt-btn px-4 py-2 bg-[var(--border)] hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
