import React, { useEffect, useState } from 'react';
import { useAuth, useSocket } from '@/hooks';
import { useChat } from '@/context/ChatContext';

/**
 * DirectMessagesPanel - Sidebar showing DM conversations
 * Displays list of conversations with unread counts, online status, and last message preview
 */
export default function DirectMessagesPanel({ onSelectConversation }) {
  const { user, token } = useAuth();
  const { sendDirectMessage, onUserPresence } = useSocket(user?.id, user?.role, localStorage.getItem('token'));
  const { conversations, loadConversations } = useChat();

  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState('');
  const [showContacts, setShowContacts] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const loadContacts = async () => {
      try {
        setContactsLoading(true);
        setContactsError('');

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/dm/contacts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load contacts');
        }

        const data = await response.json();
        if (isMounted) {
          setContacts(data.contacts || []);
        }
      } catch (error) {
        if (isMounted) {
          setContactsError(error.message || 'Failed to load contacts');
        }
      } finally {
        if (isMounted) {
          setContactsLoading(false);
        }
      }
    };

    loadContacts();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Keep online dots updated via presence events.
  useEffect(() => {
    if (!onUserPresence) return;

    const unsubscribe = onUserPresence((data) => {
      if (data.onlineUsers) {
        setOnlineUsers(new Set(data.onlineUsers));
      }
    });

    return unsubscribe;
  }, [onUserPresence]);

  const getRoleColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-red-500/20 text-red-700 dark:text-red-300';
      case 'TESTER':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'DEVELOPER':
        return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const getRoleBadgeText = (role) => {
    return role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'User';
  };

  const truncateMessage = (text, maxLength = 40) => {
    return text?.length > maxLength ? `${text.substring(0, maxLength)}...` : text || '';
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--muted)]">💬 Direct Messages</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-elevated)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
          💬 Direct Messages
        </h3>
        <button
          onClick={() => setShowContacts((prev) => !prev)}
          className="text-[var(--primary)] hover:text-[var(--primary-strong)] text-lg leading-none"
          title="Start a new DM"
        >
          +
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 || showContacts ? (
          <div className="px-4 py-4">
            <div className="flex flex-col items-center justify-center h-24 text-[var(--muted)]">
              <div className="text-3xl mb-2">👋</div>
              <div className="text-sm text-center">Start a new DM</div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                Start a new DM
              </div>

              {contactsError && (
                <div className="text-xs text-[var(--danger)] mb-2">
                  {contactsError}
                </div>
              )}

              {contactsLoading ? (
                <div className="text-xs text-[var(--muted)]">Loading contacts...</div>
              ) : contacts.length === 0 ? (
                <div className="text-xs text-[var(--muted)]">No contacts available.</div>
              ) : (
                <div className="space-y-1">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() =>
                        onSelectConversation({
                          recipientId: contact.id,
                          recipientName: contact.name,
                          recipientRole: contact.role,
                          recipientOnline: onlineUsers.has(contact.id),
                        })
                      }
                      className="w-full text-left px-3 py-2 rounded text-xs transition-colors hover:bg-[var(--surface)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{contact.name}</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${getRoleColor(contact.role)}`}>
                          {getRoleBadgeText(contact.role)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {conversations.map((conversation) => {
              const isOnline = onlineUsers.has(conversation.otherUserId);
              const hasUnread = conversation.unreadCount > 0;

              return (
                <button
                  key={conversation.otherUserId}
                  onClick={() =>
                    onSelectConversation({
                      recipientId: conversation.otherUserId,
                      recipientName: conversation.name,
                      recipientRole: conversation.role,
                      recipientOnline: isOnline,
                    })
                  }
                  className={`w-full px-4 py-3 hover:bg-[var(--surface)] transition-colors text-left ${
                    hasUnread ? 'bg-[var(--primary)]/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {conversation.picture ? (
                      <img
                        src={conversation.picture}
                        alt={conversation.name}
                        className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold">
                          {conversation.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Conversation info */}
                    <div className="flex-1 min-w-0">
                      {/* Header: Name + status + time */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-semibold text-[var(--muted-strong)] truncate">
                            {conversation.name}
                          </p>
                          <span
                            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                              isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          ></span>
                        </div>
                        <span className="text-xs text-[var(--muted)] flex-shrink-0 ml-2">
                          {conversation.lastMessageAt
                            ? new Date(conversation.lastMessageAt).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric' }
                              )
                            : '—'}
                        </span>
                      </div>

                      {/* Role badge */}
                      <div className="mb-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(
                            conversation.role
                          )}`}
                        >
                          {getRoleBadgeText(conversation.role)}
                        </span>
                      </div>

                      {/* Last message preview + unread count */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-[var(--muted)] truncate max-w-xs">
                          {truncateMessage(conversation.lastMessage || 'No messages yet')}
                        </p>
                        {hasUnread && (
                          <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-[var(--primary)] text-white rounded-full">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
