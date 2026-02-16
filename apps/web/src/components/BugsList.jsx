import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

export default function BugsList({ 
  onBugSelect, 
  onStatusUpdate,
  onRequestRetest 
}) {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    severity: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  
  // Fetch bugs on mount and when filters change
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchBugs();
    } else {
      setLoading(false);
      setError('Please login to view bugs');
    }
  }, [filters, page]);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
      });

      const data = await apiClient.get(`/api/developer/bugs/assigned?${queryParams}`);
      setBugs(data.bugs || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch bugs');
      setBugs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPage(1);
  };

  const getStatusColor = (status) => {
    const colors = {
      'NEW': 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
      'IN_PROGRESS': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-300',
      'FIXED': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
      'WONTFIX': 'bg-gray-500/10 text-gray-600 dark:text-gray-300',
      'DUPLICATE': 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
    };
    return colors[status] || colors['NEW'];
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'CRITICAL': 'text-red-600 dark:text-red-300 font-bold',
      'HIGH': 'text-orange-600 dark:text-orange-300 font-semibold',
      'MEDIUM': 'text-yellow-600 dark:text-yellow-300',
      'LOW': 'text-green-600 dark:text-green-300',
    };
    return colors[severity] || 'text-gray-600';
  };

  return (
    <div className="tt-card">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Assigned Bugs</h3>
          <span className="text-sm text-[var(--muted)] bg-[var(--bg-elevated)] px-3 py-1 rounded-full">
            {bugs.length} bugs
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-2.5 text-[var(--muted)] text-lg">🔍</span>
          <input
            type="text"
            placeholder="Search by bug number, title, or description..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-3">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="FIXED">Fixed</option>
            <option value="WONTFIX">Won't Fix</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priority</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Bug List */}
      <div className="divide-y divide-[var(--border)]">
        {loading ? (
          <div className="px-6 py-8 text-center text-[var(--muted)]">
            Loading bugs...
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-center text-red-600">
            {error}
          </div>
        ) : bugs.length === 0 ? (
          <div className="px-6 py-8 text-center text-[var(--muted)]">
            No bugs found
          </div>
        ) : (
          bugs.map((bug) => (
            <div
              key={bug.id}
              className="px-6 py-4 hover:bg-[var(--bg-elevated)] transition cursor-pointer group"
              onClick={() => onBugSelect(bug.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono bg-[var(--bg-elevated)] px-2 py-1 rounded text-[var(--muted-strong)]">
                      {bug.bugNumber}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(bug.status)}`}>
                      {bug.status.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs font-semibold ${getSeverityColor(bug.severity)}`}>
                      {bug.severity}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {bug.title}
                  </h4>
                  <p className="text-sm text-[var(--muted)] line-clamp-2">
                    {bug.description}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Will implement quick actions
                    }}
                    className="px-3 py-1 text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 rounded transition opacity-0 group-hover:opacity-100"
                  >
                    Details
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <div className="flex gap-4">
                  {bug.sourceTestCase && (
                    <span>Test Case: {bug.sourceTestCase.name}</span>
                  )}
                  <span>{bug.comments?.length || 0} comments</span>
                </div>
                <span>{new Date(bug.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && bugs.length > 0 && (
        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] disabled:opacity-50 rounded transition"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--muted)]">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={bugs.length < pageSize}
            className="px-3 py-1 text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] disabled:opacity-50 rounded transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
