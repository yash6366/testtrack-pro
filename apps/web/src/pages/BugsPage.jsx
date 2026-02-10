import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';

export default function BugsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  
  const projectId = searchParams.get('projectId') || localStorage.getItem('selectedProjectId');
  const page = Number(searchParams.get('page')) || 1;
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadBugs();
  }, [projectId, page, status, priority]);

  const loadBugs = async () => {
    if (!projectId) {
      setError('No project selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const query = new URLSearchParams({
        projectId,
        ...(status && { status }),
        ...(priority && { priority }),
        ...(search && { search }),
        page,
        limit: 20
      });

      const response = await apiClient.get(`/api/bugs?${query}`);
      setBugs(response.data || response.bugs || []);
      setTotal(response.pagination?.totalCount || response.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load bugs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (newStatus) => {
    navigate(`/bugs?projectId=${projectId}&status=${newStatus}`);
  };

  const priorityColor = {
    P0: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    P1: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    P2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    P3: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    P4: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };

  const statusColor = {
    NEW: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    ASSIGNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    FIXED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    AWAITING_VERIFICATION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    VERIFIED_FIXED: 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100',
    REOPENED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    CLOSED: 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-100'
  };

  const severityColor = {
    CRITICAL: 'text-red-600 dark:text-red-400',
    MAJOR: 'text-orange-600 dark:text-orange-400',
    MINOR: 'text-blue-600 dark:text-blue-400',
    TRIVIAL: 'text-gray-600 dark:text-gray-400'
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Bug Management</h1>
          {user?.role === 'TESTER' && (
            <button
              onClick={() => navigate('/bugs/create')}
              className="tt-btn tt-btn-primary"
            >
              + Report Bug
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="tt-card p-4 mb-6 flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search bugs by title or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
          />

          <select
            value={status}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
          >
            <option value="">All Status</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="FIXED">Fixed</option>
            <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
            <option value="VERIFIED_FIXED">Verified Fixed</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priority}
            onChange={(e) => navigate(`/bugs?projectId=${projectId}&priority=${e.target.value}`)}
            className="p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
          >
            <option value="">All Priority</option>
            <option value="P0">P0 - Blocker</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - High</option>
            <option value="P3">P3 - Medium</option>
            <option value="P4">P4 - Low</option>
          </select>

          <button
            onClick={loadBugs}
            className="tt-btn tt-btn-secondary"
          >
            Apply
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="tt-card p-4 mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700">
            <p className="text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Bug List */}
        <div className="space-y-3">
          {bugs.length === 0 ? (
            <div className="tt-card p-8 text-center">
              <p className="text-[var(--muted)]">No bugs found</p>
            </div>
          ) : (
            bugs.map(bug => (
              <div
                key={bug.id}
                onClick={() => navigate(`/bugs/${bug.id}`)}
                className="tt-card p-4 hover:shadow-lg cursor-pointer transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--foreground)]">
                        {bug.bugNumber}
                      </h3>
                      <span className={`font-semibold ${severityColor[bug.severity]}`}>
                        {bug.severity}
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-[var(--foreground)]">
                      {bug.title}
                    </h4>
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {bug.description?.substring(0, 100)}...
                    </p>
                  </div>
                  <div className="flex gap-2 flex-col items-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor[bug.status]}`}>
                      {bug.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityColor[bug.priority]}`}>
                      {bug.priority}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-[var(--muted)] mt-4">
                  <span>
                    Reported by {bug.reporter?.name} •{' '}
                    {new Date(bug.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-medium">
                    {bug.assignee?.name ? `Assigned to ${bug.assignee.name}` : 'Unassigned'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: Math.ceil(total / 20) }).map((_, i) => (
              <button
                key={i + 1}
                onClick={() => navigate(`/bugs?projectId=${projectId}&page=${i + 1}`)}
                className={`px-4 py-2 rounded font-medium ${
                  page === i + 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--border)] text-[var(--foreground)]'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
