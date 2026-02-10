import RealtimeDiscussionModal from '@/components/RealtimeDiscussionModal';

/**
 * BugDiscussion Component
 * Allows developers to discuss bugs in real-time with other team members
 * @param {string} bugId - The bug ID
 * @param {string} bugTitle - The bug title
 * @param {function} onClose - Callback when closing discussion
 */
export default function BugDiscussion({ bugId, bugTitle, onClose }) {
  return (
    <RealtimeDiscussionModal
      roomId={bugId}
      roomPrefix="bug"
      title="Bug Discussion"
      subtitle={bugTitle}
      onClose={onClose}
      closeLabel="×"
      messageType="BUG_DISCUSSION"
      placeholder="Type your message..."
      theme="blue"
      roleLabel="Developer"
      emptyMessage="No messages yet. Start the discussion!"
      connectingMessage="⚠ Connecting to chat server..."
      sendButtonLabel="Send"
    />
  );
}
