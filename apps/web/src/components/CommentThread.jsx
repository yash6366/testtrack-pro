import { useState } from 'react';

export default function CommentThread({ bugId, comments = [], currentUserId, onCommentDeleted, onCommentUpdated }) {
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [updating, setUpdating] = useState(null);

  const canEdit = (comment) => {
    const now = new Date();
    const createdAt = new Date(comment.commentedAt);
    const diffMinutes = (now - createdAt) / (1000 * 60);
    return currentUserId === comment.author?.id && diffMinutes < 15; // 15 min edit window
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Delete this comment?')) return;

    try {
      setDeleting(commentId);
      const response = await fetch(`/api/developer/bugs/${bugId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete comment');
      
      onCommentDeleted?.(commentId);
    } catch (err) {
      alert('Error deleting comment: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleEditSubmit = async (commentId) => {
    if (!editBody.trim()) return;

    try {
      setUpdating(commentId);
      const response = await fetch(`/api/developer/bugs/${bugId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ body: editBody }),
      });

      if (!response.ok) throw new Error('Failed to update comment');

      const updated = await response.json();
      onCommentUpdated?.(updated);
      setEditingId(null);
      setEditBody('');
    } catch (err) {
      alert('Error updating comment: ' + err.message);
    } finally {
      setUpdating(null);
    }
  };

  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--muted)]">
        No comments yet. Be the first to add one!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="bg-[var(--bg-elevated)] p-4 rounded-lg">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold">
                {comment.author?.name.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-semibold text-sm">{comment.author?.name || 'Unknown User'}</p>
                <p className="text-xs text-[var(--muted)]">
                  {new Date(comment.commentedAt).toLocaleDateString()} at{' '}
                  {new Date(comment.commentedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Internal Badge */}
            {comment.isInternal && (
              <span className="px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-300 text-xs font-semibold rounded-full">
                Internal
              </span>
            )}
          </div>

          {/* Content */}
          {editingId === comment.id ? (
            <div className="space-y-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows="3"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1 text-sm bg-[var(--bg)] text-[var(--text)] rounded hover:bg-[var(--bg-elevated)] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleEditSubmit(comment.id)}
                  disabled={updating === comment.id}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {updating === comment.id ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap mb-3">{comment.body}</p>

              {/* Actions */}
              {currentUserId === comment.author?.id && (
                <div className="flex gap-2 text-xs">
                  {canEdit(comment) && (
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditBody(comment.body);
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deleting === comment.id}
                    className="text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    {deleting === comment.id ? 'Deleting...' : 'Delete'}
                  </button>
                  {!canEdit(comment) && (
                    <span className="text-[var(--muted)]">(Edit window closed)</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
