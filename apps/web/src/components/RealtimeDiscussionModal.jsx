import { useEffect, useRef, useState } from 'react';
import { useAuth, useSocket } from '@/hooks';
import { apiClient } from '@/lib/apiClient';
import MuteBanner from '@/components/MuteBanner';
import ChannelStatusOverlay from '@/components/ChannelStatusOverlay';

const THEMES = {
  blue: {
    bubbleSelf: 'bg-[var(--surface-strong)] border-[var(--primary)] ml-8',
    button: 'bg-[var(--primary)] hover:bg-[var(--primary-strong)]',
    inputRing: 'focus:ring-[var(--primary)]',
    attachmentPanel: 'bg-[var(--bg-elevated)] text-[var(--muted-strong)]',
    attachmentClear: 'text-[var(--primary)] hover:text-[var(--primary-strong)]',
  },
  green: {
    bubbleSelf: 'bg-emerald-500/10 border-emerald-500/30 ml-8',
    button: 'bg-emerald-500 hover:bg-emerald-600',
    inputRing: 'focus:ring-emerald-500',
    attachmentPanel: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    attachmentClear: 'text-emerald-600 hover:text-emerald-700',
  },
};

// Reaction emoji options
const REACTION_EMOJIS = ['👍', '👀', '✅', '❗'];

export default function RealtimeDiscussionModal({
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
  selectedMessage = null,
  onMessageSelect = null,
  isInlineMode = false,
}) {
  const { user, token, updateUser } = useAuth();
  const {
    connected,
    sendMsg,
    onMessage,
    setupRoom,
    typingUsers,
    indicateTyping,
    indicateStopTyping,
    onReaction,
    onUserPresence,
    onPinnedMessage,
    sendReaction,
    sendReply,
    getPinnedMessages,
    pinMessage,
    unpinMessage,
    getChannelMembers,
    onMessageDeleted,
    onUserMuted,
    onUserUnmuted,
    onChannelLocked,
    onChannelUnlocked,
    onChatDisabled,
    onChatEnabled,
  } = useSocket(user?.id, user?.role, token);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachmentState, setAttachmentState] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [reactions, setReactions] = useState(new Map());
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const [channelMembers, setChannelMembers] = useState([]);
  const [channelStatus, setChannelStatus] = useState({ isLocked: false, isDisabled: false });
  const [suggestedMentions, setSuggestedMentions] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);
  const longPressRef = useRef(null);
  const messagesEndRef = useRef(null);

  const room = `${roomPrefix}-${roomId}`;
  const channelId = Number(roomId?.split('-').pop() || roomId);
  const messageInputId = `discussion-${roomPrefix}-${roomId}-message`;
  const attachmentInputId = `discussion-${roomPrefix}-${roomId}-attachment`;
  const typingUsersInRoom = typingUsers.get(room) || new Set();
  const themeStyles = THEMES[theme] ?? THEMES.blue;
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const isMuted = Boolean(user?.isMuted) && (!user?.mutedUntil || new Date(user.mutedUntil) > new Date());
  const canInteract = isAdmin || (!channelStatus.isDisabled && !channelStatus.isLocked);
  const isInputBlocked = !connected || isMuted || (!isAdmin && (channelStatus.isDisabled || channelStatus.isLocked));

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup room and load initial data
  useEffect(() => {
    if (!connected) return;

    const cleanup = setupRoom(room);
    const resolvedChannelId = Number(roomId.split('-').pop() || roomId);

    // Load channel members
    if (!Number.isNaN(resolvedChannelId)) {
      getChannelMembers(resolvedChannelId).then((data) => {
        setChannelMembers(data.members || []);
      }).catch((err) => console.error('Failed to load members:', err));

      // Load pinned messages
      if (showPinnedMessages) {
        getPinnedMessages(resolvedChannelId).then((data) => {
          setPinnedMessages(data.pinnedMessages || []);
        }).catch((err) => console.error('Failed to load pinned messages:', err));
      }
    }

    // Listen for messages
    const unsubscribe = onMessage((msg) => {
      if (msg.room === room || Number(msg.channelId) === channelId) {
        setMessages((prev) => {
          if (prev.some((existing) => existing.id === msg.id)) {
            return prev;
          }
          return [...prev, msg];
        });
      }
    });

    // Listen for reactions
    const unsubReaction = onReaction?.((data) => {
      if (data.type === 'add') {
        setReactions((prev) => {
          const updated = new Map(prev);
          const key = `${data.messageId}:${data.reaction.emoji}`;
          if (!updated.has(key)) {
            updated.set(key, { emoji: data.reaction.emoji, count: 0, users: [] });
          }
          const reaction = updated.get(key);
          reaction.count += 1;
          if (!reaction.users.find((u) => u.id === data.reaction.userId)) {
            reaction.users.push({ id: data.reaction.userId });
          }
          return updated;
        });
      } else if (data.type === 'remove') {
        setReactions((prev) => {
          const updated = new Map(prev);
          const key = `${data.messageId}:${data.emoji}`;
          if (updated.has(key)) {
            updated.get(key).count = Math.max(0, updated.get(key).count - 1);
          }
          return updated;
        });
      }
    });

    // Listen for pinned messages
    const unsubPinned = onPinnedMessage?.((data) => {
      if (data.type === 'pinned') {
        setPinnedMessages((prev) => [data.pinnedMessage, ...prev]);
      } else if (data.type === 'unpinned') {
        setPinnedMessages((prev) =>
          prev.filter((pm) => pm.messageId !== data.messageId)
        );
      }
    });

    // Listen for user presence
    const unsubPresence = onUserPresence?.((data) => {
      if (data.type === 'joined') {
        setOnlineUsers(new Set(data.onlineUsers || []));
      } else if (data.type === 'left') {
        setOnlineUsers(new Set(data.onlineUsers || []));
      }
    });

    return () => {
      cleanup?.();
      unsubscribe?.();
      unsubReaction?.();
      unsubPinned?.();
      unsubPresence?.();
    };
  }, [connected, room, setupRoom, onMessage, onReaction, onPinnedMessage, onUserPresence, roomId, showPinnedMessages, getChannelMembers, getPinnedMessages]);

  useEffect(() => {
    if (roomPrefix !== 'channel' || Number.isNaN(channelId)) {
      return undefined;
    }

    let isMounted = true;

    const loadChannelStatus = async () => {
      try {
        const response = await apiClient.get(`/api/channels/${channelId}/status`);
        if (isMounted) {
          setChannelStatus({
            isLocked: Boolean(response.isLocked),
            isDisabled: Boolean(response.isDisabled),
          });
        }
      } catch (error) {
        console.error('Failed to load channel status:', error);
      }
    };

    loadChannelStatus();

    return () => {
      isMounted = false;
    };
  }, [roomPrefix, channelId]);

  useEffect(() => {
    if (!onMessageDeleted || !onUserMuted || !onUserUnmuted || !onChannelLocked || !onChannelUnlocked || !onChatDisabled || !onChatEnabled) {
      return undefined;
    }

    // Replace deleted messages with a stub while keeping message order intact.
    const unsubDeleted = onMessageDeleted((data) => {
      if (Number(data?.channelId) !== channelId) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? {
                ...msg,
                isDeleted: true,
                text: 'This message was deleted by an Admin.',
                message: 'This message was deleted by an Admin.',
              }
            : msg
        )
      );
      setPinnedMessages((prev) => prev.filter((pm) => pm.messageId !== data.messageId));
      setReactions((prev) => {
        const updated = new Map(prev);
        Array.from(updated.keys()).forEach((key) => {
          if (key.startsWith(`${data.messageId}:`)) {
            updated.delete(key);
          }
        });
        return updated;
      });
    });

    const unsubMuted = onUserMuted((data) => {
      if (Number(data?.userId) === user?.id) {
        updateUser({
          isMuted: true,
          mutedUntil: data?.mutedUntil || null,
          muteReason: data?.reason || null,
        });
      }
    });

    const unsubUnmuted = onUserUnmuted((data) => {
      if (Number(data?.userId) === user?.id) {
        updateUser({ isMuted: false, mutedUntil: null, muteReason: null });
      }
    });

    const unsubLocked = onChannelLocked((data) => {
      if (Number(data?.channelId) === channelId) {
        setChannelStatus((prev) => ({ ...prev, isLocked: true }));
      }
    });

    const unsubUnlocked = onChannelUnlocked((data) => {
      if (Number(data?.channelId) === channelId) {
        setChannelStatus((prev) => ({ ...prev, isLocked: false }));
      }
    });

    const unsubDisabled = onChatDisabled((data) => {
      if (Number(data?.channelId) === channelId) {
        setChannelStatus((prev) => ({ ...prev, isDisabled: true }));
      }
    });

    const unsubEnabled = onChatEnabled((data) => {
      if (Number(data?.channelId) === channelId) {
        setChannelStatus((prev) => ({ ...prev, isDisabled: false }));
      }
    });

    return () => {
      unsubDeleted?.();
      unsubMuted?.();
      unsubUnmuted?.();
      unsubLocked?.();
      unsubUnlocked?.();
      unsubDisabled?.();
      unsubEnabled?.();
    };
  }, [onMessageDeleted, onUserMuted, onUserUnmuted, onChannelLocked, onChannelUnlocked, onChatDisabled, onChatEnabled, channelId, updateUser, user?.id]);

  // Handle @mentions autocomplete
  const handleMentionInput = (text) => {
    const atIndex = text.lastIndexOf('@');
    if (atIndex === -1) {
      setSuggestedMentions([]);
      return;
    }

    const afterAt = text.substring(atIndex + 1);
    if (afterAt.includes(' ')) {
      setSuggestedMentions([]);
      return;
    }

    if (afterAt.length === 0) {
      // Show all online members
      setSuggestedMentions(channelMembers.filter((m) => onlineUsers.has(m.id)));
    } else {
      // Filter by name
      const filtered = channelMembers.filter(
        (m) => m.name.toLowerCase().includes(afterAt.toLowerCase()) && onlineUsers.has(m.id)
      );
      setSuggestedMentions(filtered);
    }
    setMentionIndex(0);
  };

  const insertMention = (memberName) => {
    const atIndex = messageText.lastIndexOf('@');
    const beforeAt = messageText.substring(0, atIndex);
    const newText = `${beforeAt}@${memberName} `;
    setMessageText(newText);
    setSuggestedMentions([]);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !connected) return;
    if (isMuted) return;
    if (!isAdmin && (channelStatus.isDisabled || channelStatus.isLocked)) return;

    const metadata = allowAttachments && attachmentState?.metadata
      ? attachmentState.metadata
      : {};

    if (replyingTo) {
      // Send as reply
      try {
        const response = await sendReply(replyingTo.id, Number(roomId.split('-').pop() || roomId), messageText.trim());
        if (response?.message) {
          setMessages((prev) => [...prev, { ...response.message, replyToId: response.replyToId }]);
        }
        setMessageText('');
        setReplyingTo(null);
        setAttachmentState(null);
      } catch (error) {
        console.error('Failed to send reply:', error);
      }
    } else {
      // Send normal message
      sendMsg(room, messageText, messageType, metadata);
      setMessageText('');
      setAttachmentState(null);
    }

    indicateStopTyping(room);
    setIsTyping(false);
  };

  const handleMessageChange = (e) => {
    if (isInputBlocked) {
      return;
    }
    const nextValue = e.target.value;
    setMessageText(nextValue);

    // Handle @mentions
    handleMentionInput(nextValue);

    if (!isTyping && nextValue.length > 0) {
      indicateTyping(room);
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      indicateStopTyping(room);
      setIsTyping(false);
    }, 3000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!onAttachmentSelected) {
      setAttachmentState({ name: file.name, metadata: { attachment: file.name } });
      return;
    }

    setAttachmentState({ name: file.name, uploading: true, error: null, metadata: null });

    try {
      const result = await onAttachmentSelected(file);
      const metadata = result?.metadata || {
        attachment: file.name,
        evidenceId: result?.evidence?.id,
        evidenceUrl: result?.evidence?.secureUrl,
        type: result?.evidence?.type,
      };
      setAttachmentState({ name: file.name, uploading: false, error: null, metadata });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setAttachmentState({ name: file.name, uploading: false, error: message, metadata: null });
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    try {
      await sendReaction(messageId, emoji, 'add');
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId, emoji) => {
    try {
      await sendReaction(messageId, emoji, 'remove');
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  const shouldHighlightMessage = (msg) => {
    const mentionMatch = msg.mentions?.some((mention) => mention.id === user?.id);
    const fallbackMatch = user?.name ? (msg.text || msg.message || '').includes(`@${user.name}`) : false;
    return Boolean(mentionMatch || fallbackMatch);
  };

  const renderMessageText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@[\w.-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={`${part}-${index}`} className="text-[var(--primary)] font-semibold">
            {part}
          </span>
        );
      }
      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };

  const handleTouchStart = (messageId) => {
    if (!canInteract) return;
    longPressRef.current = setTimeout(() => {
      setShowReactionPicker(messageId);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      await pinMessage(messageId);
    } catch (error) {
      console.error('Failed to pin message:', error);
    }
  };

  const handleUnpinMessage = async (messageId) => {
    try {
      await unpinMessage(messageId);
    } catch (error) {
      console.error('Failed to unpin message:', error);
    }
  };

  // Container wrapper for modal vs inline mode
  const containerClasses = isInlineMode 
    ? 'w-full h-full flex flex-col'
    : 'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';
  
  const cardClasses = isInlineMode 
    ? 'w-full h-full flex flex-col'
    : 'tt-card w-full max-w-2xl max-h-[540px] flex flex-col relative';

  return (
    <div className={containerClasses}>
      <div className={cardClasses}>
        {/* Channel header bar - always visible in inline mode, hidden if no title */}
        {(isInlineMode || true) && (
          <div className="border-b border-[var(--border)] p-4 flex justify-between items-center flex-shrink-0">
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-[var(--muted)]">{subtitle}</p>
            </div>
            {!isInlineMode && (
              <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--muted-strong)] font-bold text-lg">
                {closeLabel}
              </button>
            )}
          </div>
        )}

        <ChannelStatusOverlay
          isLocked={channelStatus.isLocked}
          isDisabled={channelStatus.isDisabled}
          isAdmin={isAdmin}
          channelName={title}
        />

        {(channelStatus.isLocked || channelStatus.isDisabled) && (
          <div className="border-b border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
            {channelStatus.isDisabled ? '⛔ Chat disabled for this channel' : '🔒 Channel is locked'}
            {isAdmin && ' · Admin override enabled'}
          </div>
        )}

        {/* Pinned messages section */}
        {showPinnedMessages && pinnedMessages.length > 0 && (
          <div className="border-b border-[var(--border)]">
            <button
              onClick={() => setShowPinned(!showPinned)}
              className="w-full px-4 py-2 flex items-center gap-2 text-sm font-semibold hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <span>📌 Pinned Messages ({pinnedMessages.length})</span>
              <span>{showPinned ? '▼' : '▶'}</span>
            </button>
            {showPinned && (
              <div className="px-4 py-2 bg-[var(--bg-elevated)] space-y-2 max-h-32 overflow-y-auto">
                {pinnedMessages.map((pm) => (
                  <div key={pm.id} className="text-xs bg-[var(--surface)] p-2 rounded border border-[var(--border)]">
                    <div className="font-semibold text-[var(--muted-strong)]">{pm.message?.sender?.name}</div>
                    <div className="text-[var(--muted)] truncate">{pm.message?.message}</div>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => handleUnpinMessage(pm.messageId)}
                        className="text-xs text-[var(--primary)] hover:underline mt-1"
                      >
                        Unpin
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages area - fills remaining space */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {!connected && <div className="text-center text-[var(--warning)] py-4">{connectingMessage}</div>}

          {messages.length === 0 ? (
            <div className="text-center text-[var(--muted)] py-8">{emptyMessage}</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="group">
                {/* Original message (for replies) */}
                {msg.replyToId && messages.find((m) => m.id === msg.replyToId) && (
                  <div className="text-xs text-[var(--muted)] mb-1 pl-3 border-l-2 border-[var(--primary)]/30">
                    <div className="font-semibold">↳ Reply to {messages.find((m) => m.id === msg.replyToId)?.sender?.name}</div>
                    <div className="truncate">{messages.find((m) => m.id === msg.replyToId)?.message}</div>
                  </div>
                )}

                <div
                  className={`p-3 rounded-2xl border cursor-pointer transition-colors ${
                    msg.userId === user?.id
                      ? themeStyles.bubbleSelf
                      : 'bg-[var(--bg-elevated)] border-[var(--border)] mr-8 hover:bg-[var(--surface)]'
                  } ${selectedMessage?.id === msg.id ? 'ring-2 ring-[var(--primary)]' : ''} ${shouldHighlightMessage(msg) ? 'ring-2 ring-amber-400/40' : ''}`}
                  onMouseEnter={() => onMessageSelect?.(msg)}
                  onMouseLeave={() => onMessageSelect?.(null)}
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Message header */}
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-semibold">
                      {msg.userId === user?.id ? 'You' : `${roleLabel} ${msg.sender?.name || msg.userId}`}
                    </p>
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Message text */}
                  {msg.isDeleted ? (
                    <p className="text-[var(--muted)] italic">🚫 This message was deleted by an Admin.</p>
                  ) : (
                    <p className="text-[var(--muted-strong)]">{renderMessageText(msg.text || msg.message)}</p>
                  )}

                  {/* Attachment */}
                  {allowAttachments && msg.metadata?.attachment && (
                    <div className="mt-2 bg-[var(--surface)] border border-[var(--border)] p-2 rounded text-xs flex items-center justify-between gap-2">
                      <span>{attachmentPrefix}{msg.metadata.attachment}</span>
                      {msg.metadata?.evidenceUrl && (
                        <a
                          href={msg.metadata.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--primary)] hover:underline"
                        >
                          Open
                        </a>
                      )}
                    </div>
                  )}

                  {/* Reactions */}
                  <div className="mt-2 flex flex-wrap gap-1 items-center">
                    {msg.id && Array.from(reactions.entries())
                      .filter(([k]) => k.startsWith(`${msg.id}:`))
                      .map(([k, reaction]) => (
                        <button
                          key={k}
                          onClick={() => {
                            if (!canInteract || msg.isDeleted) return;
                            const userReacted = reaction.users.find((u) => u.id === user?.id);
                            if (userReacted) {
                              handleRemoveReaction(msg.id, reaction.emoji);
                            } else {
                              handleAddReaction(msg.id, reaction.emoji);
                            }
                          }}
                          className="px-2 py-1 rounded-full bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-xs flex items-center gap-1 transition-colors"
                          title={reaction.users.map((u) => u.name || `User ${u.id}`).join(', ')}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-[var(--muted-strong)]">{reaction.count}</span>
                        </button>
                      ))}

                    {/* Add reaction button (visible on hover) */}
                    {selectedMessage?.id === msg.id && canInteract && !msg.isDeleted && (
                      <div className="relative">
                        <button
                          onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                          className="px-2 py-1 rounded-full hover:bg-[var(--primary)]/10 text-sm transition-colors"
                          title="Add reaction"
                        >
                          😊
                        </button>

                        {/* Reaction picker */}
                        {showReactionPicker === msg.id && (
                          <div className="absolute bottom-full mb-2 p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg flex gap-1 z-10">
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleAddReaction(msg.id, emoji)}
                                className="text-lg hover:scale-125 transition-transform"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reply button (visible on hover) */}
                    {selectedMessage?.id === msg.id && canInteract && !msg.isDeleted && (
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="px-2 py-1 rounded hover:bg-[var(--primary)]/10 text-xs transition-colors"
                        title="Reply to message"
                      >
                        ↩ Reply
                      </button>
                    )}

                    {/* Pin button (Admin only, visible on hover) */}
                    {selectedMessage?.id === msg.id && user?.role === 'ADMIN' && !msg.isDeleted && (
                      <button
                        onClick={() => handlePinMessage(msg.id)}
                        className="px-2 py-1 rounded hover:bg-[var(--primary)]/10 text-xs transition-colors"
                        title="Pin this message"
                      >
                        📌 Pin
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {typingUsersInRoom.size > 0 && (
            <div className="text-sm text-[var(--muted)] italic">
              {Array.from(typingUsersInRoom).join(', ')} is typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area - fixed at bottom */}
        <div className="border-t border-[var(--border)] p-4 space-y-2 flex-shrink-0">
          <MuteBanner mutedUntil={user?.mutedUntil} muteReason={user?.muteReason} />
          {/* Reply preview */}
          {replyingTo && (
            <div className="bg-[var(--bg-elevated)] border-l-2 border-[var(--primary)] p-2 rounded flex justify-between items-start text-xs">
              <div>
                <div className="font-semibold text-[var(--muted-strong)]">Replying to {replyingTo.sender?.name}</div>
                <div className="text-[var(--muted)] truncate max-w-xs">{replyingTo.text || replyingTo.message}</div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-[var(--muted)] hover:text-[var(--muted-strong)]"
              >
                ✕
              </button>
            </div>
          )}

          {/* Attachment state */}
          {allowAttachments && attachmentState && (
            <div className={`${themeStyles.attachmentPanel} p-2 rounded-xl text-sm flex justify-between items-center`}>
              <span>
                {attachmentPrefix}{attachmentState.name}
                {attachmentState.uploading ? ' (uploading...)' : ''}
                {attachmentState.error ? ` (failed: ${attachmentState.error})` : ''}
              </span>
              <button onClick={() => setAttachmentState(null)} className={themeStyles.attachmentClear}>
                x
              </button>
            </div>
          )}

          {/* @mentions suggestions */}
          {suggestedMentions.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 max-h-32 overflow-y-auto">
              {suggestedMentions.map((member, index) => (
                <button
                  key={member.id}
                  onClick={() => insertMention(member.name)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    index === mentionIndex
                      ? 'bg-[var(--primary)]/20'
                      : 'hover:bg-[var(--primary)]/10'
                  }`}
                >
                  <span className="font-semibold">{member.name}</span>
                  <span className="ml-2 text-xs text-[var(--muted)]">{member.role}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input and send */}
          <div className="flex gap-2">
            <input
              id={messageInputId}
              name="message"
              type="text"
              value={messageText}
              onChange={handleMessageChange}
              placeholder={placeholder}
              disabled={isInputBlocked}
              className={`tt-input flex-1 ${themeStyles.inputRing} disabled:bg-[var(--bg-elevated)]`}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              aria-label={placeholder || 'Message'}
            />
            {allowAttachments && (
              <label htmlFor={attachmentInputId} className="px-3 py-2 border border-[var(--border)] rounded-2xl hover:bg-[var(--bg-elevated)] cursor-pointer flex items-center gap-1">
                <span className="text-lg">{uploadLabel}</span>
                <input
                  id={attachmentInputId}
                  name="attachment"
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept={attachmentAccept}
                />
              </label>
            )}
            <button
              onClick={handleSendMessage}
              disabled={isInputBlocked || !messageText.trim()}
              className={`tt-btn ${themeStyles.button} text-white px-4 py-2 text-sm disabled:opacity-70`}
            >
              {sendButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
