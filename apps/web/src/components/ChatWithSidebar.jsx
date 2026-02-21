import React, { useState } from 'react';
import RealtimeDiscussionModal from '@/components/RealtimeDiscussionModal';
import OnlineUsersPanel from '@/components/OnlineUsersPanel';

/**
 * Chat wrapper component that includes RealtimeDiscussionModal with
 * an OnlineUsersPanel sidebar on the right (collapsible on mobile)
 */
export default function ChatWithSidebar({
  roomId,
  roomPrefix,
  title,
  subtitle,
  onClose,
  closeLabel = 'x',
  messageType,
  placeholder,
  theme = 'blue',
  roleLabel = 'User',
  emptyMessage = 'No messages yet.',
  connectingMessage = 'Connecting to chat server...',
  sendButtonLabel = 'Send',
  allowAttachments = false,
  attachmentAccept = 'image/*,.pdf,.txt',
  attachmentPrefix = 'Attachment: ',
  uploadLabel = 'Attach',
  onAttachmentSelected,
  showPinnedMessages = true,
  showOnlineUsers = true,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-6xl max-h-[540px] flex gap-4">
        {/* Main chat area */}
        <div className="flex-1 min-w-0">
          <RealtimeDiscussionModal
            roomId={roomId}
            roomPrefix={roomPrefix}
            title={title}
            subtitle={subtitle}
            onClose={onClose}
            closeLabel={closeLabel}
            messageType={messageType}
            placeholder={placeholder}
            theme={theme}
            roleLabel={roleLabel}
            emptyMessage={emptyMessage}
            connectingMessage={connectingMessage}
            sendButtonLabel={sendButtonLabel}
            allowAttachments={allowAttachments}
            attachmentAccept={attachmentAccept}
            attachmentPrefix={attachmentPrefix}
            uploadLabel={uploadLabel}
            onAttachmentSelected={onAttachmentSelected}
            showPinnedMessages={showPinnedMessages}
            selectedMessage={selectedMessage}
            onMessageSelect={setSelectedMessage}
          />
        </div>

        {/* Right sidebar - Online users (collapsible on smaller screens) */}
        {showOnlineUsers && (
          <>
            {/* Toggle button for mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sm:hidden tt-btn bg-[var(--primary)] text-white px-3 py-2 rounded absolute top-4 right-4"
              title={sidebarOpen ? 'Hide users' : 'Show users'}
            >
              👥
            </button>

            {/* Sidebar panel */}
            <div
              className={`${
                sidebarOpen ? 'block' : 'hidden'
              } sm:block tt-card w-full max-w-xs max-h-[540px] overflow-hidden flex flex-col border-l border-[var(--border)]`}
            >
              <OnlineUsersPanel
                roomId={roomId}
                roomPrefix={roomPrefix}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
