import { useState, useRef, useEffect } from 'react';

export default function CommentInput({ bugId, onCommentAdded, teamMembers = [] }) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const textareaRef = useRef(null);

  // Detect @mentions in text
  const handleTextChange = (value) => {
    setBody(value);

    // Check for @ symbol
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.substring(lastAtIndex + 1);
      const spaceIndex = afterAt.indexOf(' ');
      
      if (spaceIndex === -1 || afterAt.length === 0) {
        const query = afterAt.toLowerCase();
        setMentionQuery(query);
        setShowMentions(true);
        setMentionIndex(lastAtIndex);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member) => {
    const beforeMention = body.substring(0, mentionIndex);
    const afterMention = body.substring(mentionIndex).replace('@' + mentionQuery, '');
    const newText = beforeMention + '@' + member.name + ' ' + afterMention;
    setBody(newText);
    setShowMentions(false);
    setMentionQuery('');
    textareaRef.current?.focus();
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!body.trim()) {
      setError('Please enter a comment');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/developer/bugs/${bugId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ body, isInternal }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      const comment = await response.json();
      setBody('');
      setIsInternal(false);
      setError(null);
      onCommentAdded?.(comment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Add a comment... (use @name to mention team members)"
          rows="3"
          className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />

        {/* Mention Suggestions */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-lg z-10">
            <div className="max-h-40 overflow-y-auto">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => insertMention(member)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-500/20 transition flex items-center gap-2"
                >
                  <span className="w-6 h-6 bg-indigo-500/30 rounded-full flex items-center justify-center text-xs font-bold">
                    {member.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-[var(--muted)]">{member.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border)]"
          />
          <span className="text-sm text-[var(--muted)]">Internal note (only visible to developers)</span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={loading || !body.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </div>
  );
}
