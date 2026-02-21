import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/DashboardLayout';
import BackButton from '@/components/ui/BackButton';

export default function AuditLogsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pagination, setPagination] = useState({ skip: 0, take: 50, total: 0, pages: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    performedBy: '',
    resourceType: '',
    resourceId: '',
    projectId: '',
    startDate: '',
    endDate: '',
  });

  const actionTypes = [
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'USER_ROLE_CHANGED',
    'USER_DEACTIVATED',
    'USER_REACTIVATED',
    'USER_ACCOUNT_UNLOCKED',
    'PROJECT_CREATED',
    'PROJECT_UPDATED',
    'PROJECT_DELETED',
    'TEST_CREATED',
    'TEST_UPDATED',
    'TEST_DELETED',
    'BUG_CREATED',
    'BUG_UPDATED',
    'BUG_STATUS_CHANGED',
    'SETTINGS_CHANGED',
    'ADMIN_ACTION',
  ];

  const resourceTypes = [
    'USER',
    'PROJECT',
    'TESTCASE',
    'BUG',
    'EXECUTION',
    'SUITE',
    'MILESTONE',
    'SETTINGS',
  ];

  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams({
        skip: ((currentPage - 1) * pagination.take).toString(),
        take: pagination.take.toString(),
      });

      // Add active filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await apiClient.get(`/api/admin/audit-logs?${queryParams}`);
      setLogs(response.logs || []);
      setPagination(response.pagination || { skip: 0, take: 50, total: 0, pages: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      action: '',
      performedBy: '',
      resourceType: '',
      resourceId: '',
      projectId: '',
      startDate: '',
      endDate: '',
    });
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      setError('');

      const queryParams = new URLSearchParams();

      // Add active filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await apiClient.get(`/api/admin/audit-logs/export?${queryParams}`);

      // Download as JSON file
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage('Audit logs exported successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to export audit logs');
      console.error(err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('CREATED')) return 'bg-green-500/10 text-green-600 dark:text-green-300';
    if (action.includes('UPDATED') || action.includes('CHANGED'))
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-300';
    if (action.includes('DELETED') || action.includes('DEACTIVATED'))
      return 'bg-red-500/10 text-red-600 dark:text-red-300';
    if (action.includes('REACTIVATED') || action.includes('UNLOCKED'))
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-300';
    return 'bg-gray-500/10 text-gray-600 dark:text-gray-300';
  };

  const hasActiveFilters = Object.values(filters).some((value) => value && value !== '');

  if (loading && logs.length === 0) {
    return (
      <DashboardLayout user={user} dashboardLabel="Audit Logs" headerTitle="Audit Logs">
        <div className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
        <div className="mb-4">
          <BackButton label="Back to Dashboard" fallback="/dashboard" />
        </div>

      user={user}
      dashboardLabel="Audit Logs"
      headerTitle="Audit Logs"
      headerSubtitle="Complete audit trail of all system activities"
    >
      <div className="p-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900 border border-green-200 text-green-800 dark:text-green-200 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {/* Filters */}
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Filters</h2>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="tt-btn tt-btn-outline px-3 py-1.5 text-sm"
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  className="tt-btn tt-btn-primary px-4 py-1.5 text-sm"
                >
                  {exportLoading ? 'Exporting...' : '↓ Export Logs'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Action Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Action Type</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {actionTypes.map((action) => (
                    <option key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Resource Type</label>
                <select
                  value={filters.resourceType}
                  onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Resources</option>
                  {resourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* User ID Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Performed By (User ID)</label>
                <input
                  type="number"
                  value={filters.performedBy}
                  onChange={(e) => handleFilterChange('performedBy', e.target.value)}
                  placeholder="Enter user ID"
                  className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Resource ID Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Resource ID</label>
                <input
                  type="number"
                  value={filters.resourceId}
                  onChange={(e) => handleFilterChange('resourceId', e.target.value)}
                  placeholder="Enter resource ID"
                  className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Project ID Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Project ID</label>
                <input
                  type="number"
                  value={filters.projectId}
                  onChange={(e) => handleFilterChange('projectId', e.target.value)}
                  placeholder="Enter project ID"
                  className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--muted)]">
            Showing {logs.length} of {pagination.total} audit log entries
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>

        {/* Audit Logs Table */}
        {logs.length === 0 ? (
          <div className="tt-card p-8 text-center">
            <p className="text-[var(--muted)]">
              {hasActiveFilters
                ? 'No audit logs match your filters'
                : 'No audit logs found'}
            </p>
          </div>
        ) : (
          <div className="tt-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Performed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--hover-bg)]">
                      <td className="px-6 py-4 text-sm">
                        <div className="text-[var(--foreground)]">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded whitespace-nowrap ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[var(--foreground)]">
                          {log.actor?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          {log.actor?.email || `ID: ${log.performedBy}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <span className="text-[var(--muted)]">{log.resourceType}</span>
                          {log.resourceId && (
                            <span className="text-[var(--foreground)] ml-1">
                              #{log.resourceId}
                            </span>
                          )}
                        </div>
                        {log.resourceName && (
                          <div className="text-xs text-[var(--muted)] truncate max-w-xs">
                            {log.resourceName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[var(--muted)] truncate max-w-md">
                          {log.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
                <div className="text-sm text-[var(--muted)]">
                  Page {currentPage} of {pagination.pages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="tt-btn tt-btn-outline px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={currentPage >= pagination.pages}
                    className="tt-btn tt-btn-outline px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                    Audit Log Details
                  </h2>
                  <span
                    className={`px-2 py-1 text-xs rounded ${getActionBadgeColor(
                      selectedLog.action
                    )}`}
                  >
                    {selectedLog.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLog(null);
                  }}
                  className="text-[var(--muted)] hover:text-[var(--foreground)] text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">Log ID</p>
                    <p className="text-sm font-medium">#{selectedLog.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">Timestamp</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">Performed By</p>
                    <p className="text-sm font-medium">
                      {selectedLog.actor?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {selectedLog.actor?.email || `User ID: ${selectedLog.performedBy}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">Resource</p>
                    <p className="text-sm font-medium">
                      {selectedLog.resourceType}{' '}
                      {selectedLog.resourceId && `#${selectedLog.resourceId}`}
                    </p>
                    {selectedLog.resourceName && (
                      <p className="text-xs text-[var(--muted)]">{selectedLog.resourceName}</p>
                    )}
                  </div>
                  {selectedLog.projectId && (
                    <div>
                      <p className="text-xs text-[var(--muted)] mb-1">Project ID</p>
                      <p className="text-sm font-medium">#{selectedLog.projectId}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">Description</p>
                  <p className="text-sm bg-[var(--bg-elevated)] p-3 rounded">
                    {selectedLog.description}
                  </p>
                </div>

                {/* Technical Info */}
                {(selectedLog.ipAddress || selectedLog.userAgent) && (
                  <div className="border-t border-[var(--border)] pt-4">
                    <h3 className="text-sm font-semibold mb-3">Technical Details</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedLog.ipAddress && (
                        <div>
                          <p className="text-xs text-[var(--muted)] mb-1">IP Address</p>
                          <p className="text-sm font-mono bg-[var(--bg-elevated)] p-2 rounded">
                            {selectedLog.ipAddress}
                          </p>
                        </div>
                      )}
                      {selectedLog.userAgent && (
                        <div>
                          <p className="text-xs text-[var(--muted)] mb-1">User Agent</p>
                          <p className="text-xs font-mono bg-[var(--bg-elevated)] p-2 rounded break-all">
                            {selectedLog.userAgent}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Changes */}
                {(selectedLog.oldValues || selectedLog.newValues) && (
                  <div className="border-t border-[var(--border)] pt-4">
                    <h3 className="text-sm font-semibold mb-3">Changes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedLog.oldValues && (
                        <div>
                          <p className="text-xs text-[var(--muted)] mb-2">Old Values</p>
                          <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded overflow-x-auto">
                            {JSON.stringify(selectedLog.oldValues, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.newValues && (
                        <div>
                          <p className="text-xs text-[var(--muted)] mb-2">New Values</p>
                          <pre className="text-xs bg-green-50 dark:bg-green-900/20 p-3 rounded overflow-x-auto">
                            {JSON.stringify(selectedLog.newValues, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
