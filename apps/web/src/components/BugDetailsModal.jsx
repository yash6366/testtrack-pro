import { useState, useEffect } from 'react';
import FixDocumentationModal from './FixDocumentationModal';
import FixDocumentationView from './FixDocumentationView';
import CommentInput from './CommentInput';
import CommentThread from './CommentThread';
import TestCaseDetailsView from './TestCaseDetailsView';

export default function BugDetailsModal({ bugId, onClose, onStatusUpdate, onRequestRetest }) {
  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showFixDocModal, setShowFixDocModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchBugDetails();
    fetchTeamMembers();
    fetchCurrentUser();
  }, [bugId]);

  const fetchBugDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/developer/bugs/${bugId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch bug details');
      const data = await response.json();
      setBug(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`/api/users?role=DEVELOPER,TESTER`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(Array.isArray(data) ? data : data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!bug) return;

    try {
      setIsUpdatingStatus(true);
      let endpoint = '';
      const token = localStorage.getItem('token');

      if (newStatus === 'IN_PROGRESS') {
        endpoint = `/api/developer/bugs/${bugId}/start-work`;
      } else if (newStatus === 'FIXED') {
        endpoint = `/api/developer/bugs/${bugId}/mark-fixed`;
      } else if (newStatus === 'WONTFIX') {
        endpoint = `/api/developer/bugs/${bugId}/reject`;
      }

      if (!endpoint) return;

      const response = await fetch(endpoint, {
        method: newStatus === 'IN_PROGRESS' ? 'PATCH' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: newStatus === 'WONTFIX' ? JSON.stringify({ rejectionReason: 'WONTFIX' }) : undefined,
      });

      if (!response.ok) throw new Error('Failed to update bug status');
      
      const updated = await response.json();
      setBug(updated);
      onStatusUpdate?.();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFixDocumentationSuccess = () => {
    // Refresh bug details after fix documentation is saved
    fetchBugDetails();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[var(--bg)] rounded-lg shadow-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 text-center">Loading bug details...</div>
        </div>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[var(--bg)] rounded-lg shadow-lg w-full max-w-3xl mx-4 p-6">
          <div className="text-red-600">Error: {error || 'Bug not found'}</div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg)] rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-start justify-between sticky top-0 bg-[var(--bg)]">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono bg-[var(--bg-elevated)] px-2 py-1 rounded">
                {bug.bugNumber}
              </span>
              <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(bug.status)}`}>
                {bug.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h2 className="text-2xl font-bold">{bug.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] transition text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-[var(--border)] flex gap-6">
          {['details', 'reproduction', 'fix-documentation', 'comments', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 border-b-2 transition capitalize ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Status Actions */}
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg">
                <h4 className="font-semibold mb-4">Update Status</h4>
                <div className="flex gap-3 flex-wrap">
                  {bug.status !== 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                      disabled={isUpdatingStatus}
                      className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                    >
                      Start Work
                    </button>
                  )}
                  {bug.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleStatusChange('FIXED')}
                      disabled={isUpdatingStatus}
                      className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50"
                    >
                      Mark as Fixed
                    </button>
                  )}
                  {bug.status !== 'WONTFIX' && (
                    <button
                      onClick={() => handleStatusChange('WONTFIX')}
                      disabled={isUpdatingStatus}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                    >
                      Won't Fix
                    </button>
                  )}
                  {bug.status === 'FIXED' && (
                    <button
                      onClick={() => onRequestRetest?.(bugId)}
                      className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
                    >
                      Request Retest
                    </button>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-[var(--muted)] block mb-2">
                    Description
                  </label>
                  <p className="text-sm">{bug.description}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--muted)] block mb-2">
                    Reporter
                  </label>
                  <p className="text-sm">{bug.reporter?.name} ({bug.reporter?.email})</p>
                </div>
              </div>

              {/* Severity & Priority */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] block mb-2">
                    Severity
                  </label>
                  <div className="px-3 py-2 bg-[var(--bg-elevated)] rounded text-sm font-semibold">
                    {bug.severity}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] block mb-2">
                    Priority
                  </label>
                  <div className="px-3 py-2 bg-[var(--bg-elevated)] rounded text-sm font-semibold">
                    {bug.priority}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] block mb-2">
                    Environment
                  </label>
                  <div className="px-3 py-2 bg-[var(--bg-elevated)] rounded text-sm">
                    {bug.environment || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] block mb-2">
                    Affected Version
                  </label>
                  <div className="px-3 py-2 bg-[var(--bg-elevated)] rounded text-sm">
                    {bug.affectedVersion || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Related Test Case - Full Details */}
              {(bug.sourceTestCase || bug.sourceExecution) && (
                <div className="border-t border-[var(--border)] pt-6">
                  <label className="text-sm font-semibold text-[var(--muted)] block mb-3">
                    Related Test Case Details
                  </label>
                  <TestCaseDetailsView
                    sourceTestCase={bug.sourceTestCase}
                    sourceExecution={bug.sourceExecution}
                  />
                </div>
              )}
            </div>
          )}

          {/* Reproduction Tab */}
          {activeTab === 'reproduction' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-[var(--muted)] block mb-2">
                  Steps to Reproduce
                </label>
                <div className="bg-[var(--bg-elevated)] p-4 rounded text-sm whitespace-pre-wrap">
                  {bug.stepsToReproduce || 'No steps provided'}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-[var(--muted)] block mb-2">
                  Expected Behavior
                </label>
                <div className="bg-[var(--bg-elevated)] p-4 rounded text-sm whitespace-pre-wrap">
                  {bug.expectedBehavior || 'No expected behavior provided'}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-[var(--muted)] block mb-2">
                  Actual Behavior
                </label>
                <div className="bg-[var(--bg-elevated)] p-4 rounded text-sm whitespace-pre-wrap">
                  {bug.actualBehavior || 'No actual behavior provided'}
                </div>
              </div>
            </div>
          )}

          {/* Fix Documentation Tab */}
          {activeTab === 'fix-documentation' && (
            <div className="space-y-4">
              {/* Edit Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowFixDocModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                >
                  Edit Fix Documentation
                </button>
              </div>

              {/* Fix Documentation View */}
              <FixDocumentationView bug={bug} />
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              {/* Comment Input */}
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg">
                <h4 className="text-sm font-semibold mb-3">Add a Comment</h4>
                <CommentInput
                  bugId={bugId}
                  teamMembers={teamMembers}
                  onCommentAdded={(comment) => {
                    setBug(prev => ({
                      ...prev,
                      comments: [comment, ...prev.comments]
                    }));
                  }}
                />
              </div>

              {/* Comments List */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Comments ({bug.comments?.length || 0})</h4>
                <CommentThread
                  bugId={bugId}
                  comments={bug.comments || []}
                  currentUserId={currentUser?.id}
                  onCommentDeleted={(commentId) => {
                    setBug(prev => ({
                      ...prev,
                      comments: prev.comments.filter(c => c.id !== commentId)
                    }));
                  }}
                  onCommentUpdated={(updated) => {
                    setBug(prev => ({
                      ...prev,
                      comments: prev.comments.map(c => c.id === updated.id ? updated : c)
                    }));
                  }}
                />
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {bug.history && bug.history.length > 0 ? (
                bug.history.map((entry) => (
                  <div key={entry.id} className="bg-[var(--bg-elevated)] p-3 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{entry.fieldName}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {new Date(entry.changedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[var(--muted)]">
                      "{entry.oldValue}" → "{entry.newValue}"
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[var(--muted)]">No history available</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fix Documentation Modal */}
      {showFixDocModal && (
        <FixDocumentationModal
          bugId={bugId}
          bugData={bug}
          onClose={() => setShowFixDocModal(false)}
          onSuccess={handleFixDocumentationSuccess}
        />
      )}
    </div>
  );
}
