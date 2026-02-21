import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import BackButton from '@/components/ui/BackButton';
import Breadcrumb from '@/components/ui/Breadcrumb';

export default function BugDetailsPage() {
  const { bugId } = useParams();
  const { user } = useAuth();

  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusChanging, setStatusChanging] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadBug = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await apiClient.get(`/api/bugs/${bugId}`);
        if (isMounted) {
          setBug(response);
          setNewStatus(response.status);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load bug');
          console.error(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (bugId) {
      loadBug();
    }

    return () => {
      isMounted = false;
    };
  }, [bugId]);

  const loadBug = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(`/api/bugs/${bugId}`);
      setBug(response);
      setNewStatus(response.status);
    } catch (err) {
      setError(err.message || 'Failed to load bug');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await apiClient.post(`/api/bugs/${bugId}/comments`, {
        body: newComment,
        isInternal
      });
      setNewComment('');
      setIsInternal(false);
      await loadBug();
    } catch (err) {
      setError(err.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === bug.status) return;

    try {
      setStatusChanging(true);
      setError('');
      await apiClient.patch(`/api/bugs/${bugId}/status`, {
        newStatus,
        reason: 'Manual status change'
      });
      await loadBug();
    } catch (err) {
      setError(err.message || 'Failed to change status');
      // Revert to original status on error
      setNewStatus(bug.status);
    } finally {
      setStatusChanging(false);
    }
  };

  const handleAssign = async (assigneeId) => {
    try {
      await apiClient.patch(`/api/bugs/${bugId}/assign`, {
        assigneeId,
        reason: 'Manual assignment'
      });
      await loadBug();
    } catch (err) {
      setError(err.message || 'Failed to assign bug');
    }
  };

  const handleLinkCommit = async (commitHash, branchName = '', codeReviewUrl = '') => {
    if (!commitHash.trim()) {
      setError('Commit hash is required');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.patch(`/api/bugs/${bugId}/link-commit`, {
        commitHash: commitHash.trim(),
        branchName: branchName.trim() || undefined,
        codeReviewUrl: codeReviewUrl.trim() || undefined
      });
      // Clear inputs
      document.getElementById('commitHash').value = '';
      document.getElementById('branchName').value = '';
      document.getElementById('codeReviewUrl').value = '';
      await loadBug();
    } catch (err) {
      setError(err.message || 'Failed to link commit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRetest = async () => {
    try {
      await apiClient.post(`/api/bugs/${bugId}/retest-request`, {
        notes: 'Requesting re-test for fix verification'
      });
      await loadBug();
    } catch (err) {
      setError(err.message || 'Failed to request re-test');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--border)] border-t-blue-500 rounded-full" />
      </div>
    );
  }

  if (error && !bug) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-6 flex items-center justify-center">
        <div className="tt-card p-6 max-w-md">
          <h2 className="text-red-600 font-bold mb-2">Error</h2>
          <p>{error}</p>
          <div className="mt-4">
            <BackButton label="Back to Bugs" fallback="/bugs" className="w-full justify-center" />
          </div>
        </div>
      </div>
    );
  }

  if (!bug) return null;

  const statusOptions = {
    NEW: ['ASSIGNED', 'DUPLICATE', 'CANNOT_REPRODUCE', 'WORKS_AS_DESIGNED'],
    ASSIGNED: ['IN_PROGRESS', 'REOPENED', 'DUPLICATE', 'WONTFIX'],
    IN_PROGRESS: ['FIXED', 'REOPENED', 'CANNOT_REPRODUCE'],
    FIXED: ['AWAITING_VERIFICATION', 'REOPENED'],
    AWAITING_VERIFICATION: ['VERIFIED_FIXED', 'REOPENED'],
    VERIFIED_FIXED: ['CLOSED', 'REOPENED'],
    REOPENED: ['ASSIGNED', 'IN_PROGRESS'],
    CANNOT_REPRODUCE: ['REOPENED', 'CLOSED'],
    CLOSED: ['REOPENED']
  };

  const getValidStatusOptions = () => {
    return statusOptions[bug.status] || [];
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex flex-col gap-3">
          <BackButton label="Back to Bugs" fallback="/bugs" />
          <Breadcrumb
            crumbs={[
              { label: 'Dashboard', path: '/dashboard' },
              { label: 'Bugs', path: '/bugs' },
              { label: `#${bug.bugNumber}`, path: null },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                {bug.bugNumber}
              </h1>
              <span className={`px-4 py-1 rounded-full font-semibold text-sm ${
                bug.status === 'NEW' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
                bug.status === 'ASSIGNED' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                bug.status === 'IN_PROGRESS' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                bug.status === 'FIXED' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                bug.status === 'VERIFIED_FIXED' ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100' :
                bug.status === 'REOPENED' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
              }`}>
                {bug.status}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-1">
              {bug.title}
            </h2>
            <p className="text-[var(--muted)]">{bug.description}</p>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="tt-card p-4">
            <p className="text-xs text-[var(--muted)] mb-1">Priority</p>
            <p className="font-semibold">{bug.priority}</p>
          </div>
          <div className="tt-card p-4">
            <p className="text-xs text-[var(--muted)] mb-1">Severity</p>
            <p className="font-semibold">{bug.severity}</p>
          </div>
          <div className="tt-card p-4">
            <p className="text-xs text-[var(--muted)] mb-1">Environment</p>
            <p className="font-semibold">{bug.environment}</p>
          </div>
          <div className="tt-card p-4">
            <p className="text-xs text-[var(--muted)] mb-1">Assigned To</p>
            <p className="font-semibold">{bug.assignee?.name || 'Unassigned'}</p>
          </div>
          <div className="tt-card p-4">
            <p className="text-xs text-[var(--muted)] mb-1">Reporter</p>
            <p className="font-semibold">{bug.reporter?.name}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="tt-card p-4 mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700">
            <p className="text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="tt-card mb-6">
          <div className="border-b border-[var(--border)] flex gap-4 p-4 flex-wrap">
            {['overview', 'comments', 'history', 'retest'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'comments' && bug.comments?.length > 0 && (
                  <span className="ml-1 text-xs">({bug.comments.length})</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block font-semibold mb-2">Affected Version</label>
                    <p className="text-[var(--muted)]">{bug.affectedVersion}</p>
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">Reproducibility</label>
                    <p className="text-[var(--muted)]">{bug.reproducibility}</p>
                  </div>
                </div>

                {bug.rootCauseAnalysis && (
                  <div>
                    <label className="block font-semibold mb-2">Root Cause Analysis</label>
                    <p className="text-[var(--muted)]">{bug.rootCauseAnalysis}</p>
                  </div>
                )}

                {bug.fixStrategy && (
                  <div>
                    <label className="block font-semibold mb-2">Fix Strategy</label>
                    <p className="text-[var(--muted)]">{bug.fixStrategy}</p>
                  </div>
                )}

                {bug.fixedInCommitHash && (
                  <div>
                    <label className="block font-semibold mb-2">Fixed in Commit</label>
                    <code className="bg-[var(--border)] p-3 rounded block font-mono text-sm">
                      {bug.fixedInCommitHash}
                    </code>
                    {bug.fixBranchName && (
                      <p className="text-sm text-[var(--muted)] mt-2">Branch: {bug.fixBranchName}</p>
                    )}
                  </div>
                )}

                <div className="border-t border-[var(--border)] pt-6">
                  <h3 className="font-semibold mb-4">Status & Assignment</h3>
                  
                  <div className="space-y-4">
                    {/* Status Change */}
                    {user?.role === 'DEVELOPER' || user?.role === 'TESTER' ? (
                      <div>
                        <label className="block font-medium mb-2">Change Status</label>
                        <div className="flex gap-2">
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="flex-1 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
                          >
                            <option value={bug.status}>{bug.status}</option>
                            {getValidStatusOptions().map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleStatusChange}
                            disabled={statusChanging || newStatus === bug.status}
                            className="tt-btn tt-btn-primary disabled:opacity-50"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Git Commit Linking */}
                    {user?.role === 'DEVELOPER' && !bug.fixedInCommitHash && (
                      <div>
                        <label className="block font-medium mb-2">Link Fix Commit</label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            id="commitHash"
                            placeholder="Commit hash (e.g., a1b2c3d)"
                            className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)] font-mono text-sm"
                          />
                          <input
                            type="text"
                            id="branchName"
                            placeholder="Branch name (optional)"
                            className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)] text-sm"
                          />
                          <input
                            type="text"
                            id="codeReviewUrl"
                            placeholder="Code review URL (optional, e.g., GitHub PR link)"
                            className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)] text-sm"
                          />
                          <button
                            onClick={() => {
                              const hash = document.getElementById('commitHash').value;
                              const branch = document.getElementById('branchName').value;
                              const url = document.getElementById('codeReviewUrl').value;
                              if (hash) handleLinkCommit(hash, branch, url);
                            }}
                            className="tt-btn tt-btn-primary w-full"
                          >
                            Link Commit
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Request Re-test */}
                    {user?.role === 'DEVELOPER' && bug.status === 'FIXED' && (
                      <button
                        onClick={handleRequestRetest}
                        className="tt-btn tt-btn-primary w-full"
                      >
                        Request Re-test
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-6">
                {/* Add Comment */}
                <div className="border-b border-[var(--border)] pb-6">
                  <label className="block font-semibold mb-2">Add Comment</label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your comment..."
                    rows={4}
                    className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--foreground)]"
                  />
                  <div className="mt-3 flex gap-2 items-center justify-between">
                    {user?.role === 'DEVELOPER' && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                        />
                        <span className="text-sm">Internal Only (Dev Team)</span>
                      </label>
                    )}
                    <button
                      onClick={handleAddComment}
                      disabled={submitting || !newComment.trim()}
                      className="tt-btn tt-btn-primary"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {bug.comments && bug.comments.length > 0 ? (
                    bug.comments.map(comment => (
                      <div key={comment.id} className="bg-[var(--border)] p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-semibold text-[var(--foreground)]">
                              {comment.author?.name}
                            </span>
                            <p className="text-xs text-[var(--muted)]">
                              {new Date(comment.commentedAt).toLocaleString()}
                            </p>
                          </div>
                          {comment.isInternal && (
                            <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded">
                              INTERNAL
                            </span>
                          )}
                        </div>
                        <p className="text-[var(--foreground)]">{comment.body}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[var(--muted)] text-center py-8">No comments yet</p>
                  )}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {bug.history && bug.history.length > 0 ? (
                  bug.history.map(entry => (
                    <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <p className="font-semibold text-[var(--foreground)]">
                        {entry.fieldName}: <span className="font-normal">{entry.oldValue} → {entry.newValue}</span>
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        By {entry.user?.name} on {new Date(entry.changedAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[var(--muted)] text-center py-8">No history available</p>
                )}
              </div>
            )}

            {/* Re-test Tab */}
            {activeTab === 'retest' && (
              <div className="space-y-4">
                {bug.retestRequests && bug.retestRequests.length > 0 ? (
                  bug.retestRequests.map(request => (
                    <div key={request.id} className="tt-card p-4 border border-[var(--border)]">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">Re-test Request</p>
                          <p className="text-sm text-[var(--muted)]">
                            Requested {new Date(request.requestedAt).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          request.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                          request.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                          request.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                          'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      
                      {request.assignee && (
                        <p className="text-sm text-[var(--muted)]">
                          Assigned to: {request.assignee.name}
                        </p>
                      )}
                      
                      {request.notes && (
                        <p className="text-sm mt-2 text-[var(--foreground)]">{request.notes}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[var(--muted)] text-center py-8">No re-test requests yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
