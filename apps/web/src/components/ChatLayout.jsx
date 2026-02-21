import React, { useState, useEffect } from 'react';
import ChatSidebar from './ChatSidebar';
import RealtimeDiscussionModal from './RealtimeDiscussionModal';
import DirectMessageWindow from './DirectMessageWindow';
import OnlineUsersPanel from './OnlineUsersPanel';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/hooks';

/**
 * ChatLayout - 3-column persistent chat interface
 * Left sidebar (channels, direct messages) | Main chat panel | Right sidebar (online users)
 * 
 * LAYOUT STRUCTURE:
 * ┌─────────────────────────────────────────────────────────┐
 * │               TOP NAVBAR (handled by parent)             │
 * ├───────────────┬─────────────────────┬───────────────────┤
 * │               │                     │                   │
 * │  LEFT SIDEBAR │  MAIN CHAT PANEL    │  RIGHT SIDEBAR    │
 * │  (260px)      │  (flex: 1)          │  (220px)          │
 * │               │                     │                   │
 * └───────────────┴─────────────────────┴───────────────────┘
 */
export default function ChatLayout({ className = '' }) {
  const { user } = useAuth();
  const { createChannel, channels, setActiveChannelId } = useChat();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedDM, setSelectedDM] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-select first channel on mount
  useEffect(() => {
    if (selectedRoom || selectedDM) return; // Don't override if already selected
    
    const allChannels = [
      ...(channels?.general || []),
      ...(channels?.roleChannels || []),
      ...(channels?.projects || []),
    ];
    
    if (allChannels.length > 0) {
      const firstChannel = allChannels[0];
      setSelectedRoom(`channel-${firstChannel.id}`);
      setActiveChannelId(firstChannel.id);
    }
  }, [channels, selectedRoom, selectedDM, setActiveChannelId]);

  // Resolve the active channel for display
  const selectedChannelId = selectedRoom ? Number(selectedRoom.split('-')[1]) : null;
  const allChannels = [
    ...(channels?.general || []),
    ...(channels?.roleChannels || []),
    ...(channels?.projects || []),
  ];
  const activeChannel = allChannels.find((channel) => channel.id === selectedChannelId);
  const channelTitle = activeChannel?.name || 'Channel';
  const channelSubtitle = activeChannel?.type === 'DIRECT' ? 'Direct Message' : (activeChannel?.type ? `${activeChannel.type} channel` : 'Chat');

  const handleSelectChannel = (channelId) => {
    setSelectedRoom(`channel-${channelId}`);
    setSelectedDM(null);
    setActiveChannelId(channelId);
  };

  const handleSelectDirectMessage = (dmData) => {
    setSelectedDM(dmData);
    setSelectedRoom(null);
  };

  const handleCreateChannel = async (channelName, allowedRoles, projectName, allowedUserIds) => {
    await createChannel(channelName, allowedRoles, projectName, allowedUserIds);
  };

  const handleCloseChat = () => {
    // When closing, select first channel if available
    const allChannels = [
      ...(channels?.general || []),
      ...(channels?.roleChannels || []),
      ...(channels?.projects || []),
    ];
    if (allChannels.length > 0) {
      const firstChannel = allChannels[0];
      setSelectedRoom(`channel-${firstChannel.id}`);
      setActiveChannelId(firstChannel.id);
    } else {
      setSelectedRoom(null);
      setSelectedDM(null);
    }
  };

  return (
    <div className={`chat-layout flex flex-col h-full overflow-hidden ${className}`}>
      {/* Main 3-column content area */}
      <div className="chat-body flex flex-1 overflow-hidden gap-0">
        
        {/* LEFT SIDEBAR - Channels and Direct Messages */}
        <div className={`chat-sidebar-left w-64 flex-shrink-0 bg-[var(--bg-elevated)] overflow-hidden border-r border-[var(--border)] ${!isSidebarOpen && 'hidden md:flex'}`}>
          <ChatSidebar
            selectedRoom={selectedRoom}
            onSelectChannel={handleSelectChannel}
            onSelectDirectMessage={handleSelectDirectMessage}
            onCreateChannel={handleCreateChannel}
            showDirectMessages={true}
          />
        </div>

        {/* MAIN CHAT PANEL - Message display and input */}
        <div className="chat-main flex-1 flex flex-col overflow-hidden min-w-0 bg-[var(--bg)]">
          
          {/* Empty state when no chat selected */}
          {!selectedRoom && !selectedDM && (
            <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <div className="text-xl font-semibold">Welcome to Chat</div>
                <div className="text-sm text-[var(--muted)] mt-2">
                  Select a channel or start a direct message
                </div>
              </div>
            </div>
          )}

          {/* Channel chat */}
          {selectedRoom && (
            <RealtimeDiscussionModal
              roomId={selectedRoom.split('-')[1]}
              roomPrefix="channel"
              title={channelTitle}
              subtitle={channelSubtitle}
              onClose={handleCloseChat}
              placeholder="Type your message here..."
              showPinnedMessages={true}
              theme="blue"
              isInlineMode={true}
            />
          )}

          {/* Direct message chat */}
          {selectedDM && (
            <DirectMessageWindow
              recipientId={selectedDM.recipientId}
              recipientName={selectedDM.recipientName}
              recipientRole={selectedDM.recipientRole}
              recipientOnline={selectedDM.recipientOnline}
              onClose={handleCloseChat}
              placeholder="Type a message..."
              isInlineMode={true}
            />
          )}
        </div>

        {/* RIGHT SIDEBAR - Online Users (collapsible on mobile) */}
        {selectedRoom && (
          <div className="chat-sidebar-right w-56 flex-shrink-0 bg-[var(--bg-elevated)] overflow-hidden border-l border-[var(--border)] hidden lg:flex">
            <OnlineUsersPanel
              roomId={selectedRoom.split('-')[1]}
              roomPrefix="channel"
            />
          </div>
        )}
      </div>
    </div>
  );
}
