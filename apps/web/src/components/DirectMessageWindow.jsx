import { useEffect, useRef, useState } from 'react';
import { useAuth, useSocket } from '@/hooks';
import { useChat } from '@/context/ChatContext';
import MuteBanner from '@/components/MuteBanner';

const REACTION_EMOJIS = ['👍', '👀', '✅', '❗'];

/**
 * DirectMessageWindow - 1-to-1 private chat component
 * Displays conversation with a single recipient
 * Can render as a modal overlay or inline in main chat panel
 */
export default function DirectMessageWindow({
  recipientId,
  recipientName,
  recipientRole,
  recipientOnline = false,
  onClose,
  closeLabel = '×',
  placeholder = 'Type a message...',
  sendButtonLabel = 'Send',
  isInlineMode = false,
}) {
  const { user, token, updateUser } = useAuth();
  const {
    connected,
    sendDirectMessage,
    markDMRead,
    emitDMTyping,
    emitDMStopTyping,
    onDirectMessage,
    onDMRead,
    onDMTyping,
    onDMStopTyping,
    onUserMuted,
    onUserUnmuted,
  } = useSocket(user?.id, user?.role, token);

  const { directMessages, loadDMConversation, reactToDM } = useChat();

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [reactions, setReactions] = useState(new Map());
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const typingTimeoutRef = useRef(null);
  const longPressRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isMuted = Boolean(user?.isMuted) && (!user?.mutedUntil || new Date(user.mutedUntil) > new Date());
  const isInputBlocked = !connected || isMuted;

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation on mount
  useEffect(() => {
    if (!recipientId) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        await loadDMConversation(recipientId, 50, 0);
      } catch (error) {
        console.error('Failed to load DM conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [recipientId, loadDMConversation]);

  // Update local messages when context updates
  useEffect(() => {
    if (directMessages[recipientId]) {
      setMessages(directMessages[recipientId]);
    }
  }, [directMessages, recipientId]);

  // Listen for incoming DMs
  useEffect(() => {
    if (!connected) return;

    const unsubDM = onDirectMessage?.((msg) => {
      // Only display if from current recipient
      if (msg.senderId === recipientId || msg.recipientId === recipientId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m.id === msg.id)) {
            return prev;
          }
          return [...prev, msg];
        });

        // Mark as read if from recipient
        if (msg.senderId === recipientId) {
          markDMRead(recipientId);
        }
      }
    });

    const unsubRead = onDMRead?.((data) => {
      // Update message read status
      if (data.senderId === recipientId || data.userId === recipientId) {
        // Messages marked as read by recipient
      }
    });

    const unsubTyping = onDMTyping?.((data) => {
      if (data.userId === recipientId) {
        setTypingIndicator(true);
      }
    });

    const unsubStopTyping = onDMStopTyping?.((data) => {
      if (data.userId === recipientId) {
        setTypingIndicator(false);
      }
    });

    return () => {
      unsubDM?.();
      unsubRead?.();
      unsubTyping?.();
      unsubStopTyping?.();
    };
  }, [connected, recipientId, onDirectMessage, onDMRead, onDMTyping, onDMStopTyping, markDMRead]);

  useEffect(() => {
    if (!onUserMuted || !onUserUnmuted) {
      return undefined;
    }

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

    return () => {
      unsubMuted?.();
      unsubUnmuted?.();
    };
  }, [onUserMuted, onUserUnmuted, updateUser, user?.id]);

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (recipientId && messages.length > 0) {
      markDMRead(recipientId);
    }
  }, [recipientId, messages.length, markDMRead]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !connected) return;
    if (isMuted) return;

    try {
      sendDirectMessage(recipientId, messageText.trim(), replyingTo?.id || null);
      setMessageText('');
      setReplyingTo(null);
      emitDMStopTyping(recipientId);
      setIsTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleMessageChange = (e) => {
    if (isInputBlocked) {
      return;
    }
    const nextValue = e.target.value;
    setMessageText(nextValue);

    // Emit typing indicator
    if (!isTyping && nextValue.length > 0) {
      emitDMTyping(recipientId, user?.name || 'User');
      setIsTyping(true);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitDMStopTyping(recipientId);
      setIsTyping(false);
    }, 3000);
  };

  const handleAddReaction = async (messageId, emoji) => {
    try {
      await reactToDM(messageId, emoji, true);
      setShowReactionPicker(null);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const nextReactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
          nextReactions.push({ emoji, userId: user?.id });
          return { ...msg, reactions: nextReactions };
        })
      );
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId, emoji) => {
    try {
      await reactToDM(messageId, emoji, false);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const nextReactions = Array.isArray(msg.reactions)
            ? msg.reactions.filter((reaction) => !(reaction.emoji === emoji && reaction.userId === user?.id))
            : [];
          return { ...msg, reactions: nextReactions };
        })
      );
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  const handleTouchStart = (messageId) => {
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

  const getGroupedReactions = (messageReactions = []) => {
    const grouped = new Map();
    messageReactions.forEach((reaction) => {
      const emoji = reaction.emoji;
      const entry = grouped.get(emoji) || { emoji, count: 0, userIds: [] };
      entry.count += 1;
      if (reaction.userId) {
        entry.userIds.push(reaction.userId);
      }
      grouped.set(emoji, entry);
    });
    return Array.from(grouped.values());
  };

  const getRoleColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'text-red-600 dark:text-red-400';
      case 'TESTER':
        return 'text-blue-600 dark:text-blue-400';
      case 'DEVELOPER':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    const containerClasses = isInlineMode 
      ? 'w-full h-full flex flex-col'
      : 'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    const cardClasses = isInlineMode 
      ? 'w-full h-full flex flex-col'
      : 'tt-card w-full max-w-2xl max-h-[540px] flex flex-col';
    
    return (
      <div className={containerClasses}>
        <div className={cardClasses}>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-[var(--muted)]">Loading conversation...</div>
          </div>
        </div>
      </div>
    );
  }

  // Container wrapper for modal vs inline mode
  const containerClasses = isInlineMode 
    ? 'w-full h-full flex flex-col'
    : 'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4';
  
  const cardClasses = isInlineMode 
    ? 'w-full h-full flex flex-col'
    : 'tt-card w-full max-w-2xl max-h-[540px] flex flex-col';

  return (
    <div className={containerClasses}>
      <div className={cardClasses}>
        {/* Header */}
        <div className="border-b border-[var(--border)] p-4 flex justify-between items-center flex-shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{recipientName}</h2>
              <span className={`text-xs font-medium ${getRoleColor(recipientRole)}`}>
                {recipientRole}
              </span>
              <span className={`inline-block w-2 h-2 rounded-full ${recipientOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {recipientOnline ? '🟢 Online' : '⚫ Offline'}
            </p>
          </div>
          {!isInlineMode && (
            <button
              onClick={onClose}
              className="text-[var(--muted)] hover:text-[var(--muted-strong)] font-bold text-lg"
            >
              {closeLabel}
            </button>
          )}
        </div>

        {/* Messages area - fills remaining space */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--surface)] min-h-0">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--muted)]">
              <div className="text-center">
                <div className="text-3xl mb-2">💬</div>
                <div>No messages yet. Start the conversation!</div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="group">
                {msg.replyToId && messages.find((m) => m.id === msg.replyToId) && (
                  <div className="text-xs text-[var(--muted)] mb-1 pl-3 border-l-2 border-[var(--primary)]/30">
                    <div className="font-semibold">
                      ↳ Reply to {messages.find((m) => m.id === msg.replyToId)?.sender?.name || recipientName}
                    </div>
                    <div className="truncate">
                      {messages.find((m) => m.id === msg.replyToId)?.message}
                    </div>
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl border max-w-xs transition-colors ${
                    msg.senderId === user?.id
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)] ml-auto'
                      : 'bg-[var(--bg-elevated)] border-[var(--border)] mr-auto hover:bg-[var(--surface)]'
                  }`}
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Message content */}
                  <p className="text-sm break-words">{msg.message}</p>

                  {/* Reactions */}
                  {Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {getGroupedReactions(msg.reactions).map((reaction) => (
                        <button
                          key={`${msg.id}:${reaction.emoji}`}
                          onClick={() => {
                            const userReacted = reaction.userIds.includes(user?.id);
                            if (userReacted) {
                              handleRemoveReaction(msg.id, reaction.emoji);
                            } else {
                              handleAddReaction(msg.id, reaction.emoji);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--surface)]/50 hover:bg-[var(--surface)] rounded-full text-xs transition-colors"
                          title={`${reaction.emoji} ${reaction.count}`}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-xs">{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`text-xs mt-1 ${msg.senderId === user?.id ? 'text-white/70' : 'text-[var(--muted)]'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Hover actions */}
                <div className="hidden group-hover:flex justify-end gap-2 mt-1 pr-2">
                  <button
                    onClick={() => setShowReactionPicker(
                      showReactionPicker === msg.id ? null : msg.id
                    )}
                    className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-elevated)] transition-colors"
                    title="Add reaction"
                  >
                    😊
                  </button>
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-elevated)] transition-colors"
                    title="Reply to message"
                  >
                    ↩ Reply
                  </button>

                  {showReactionPicker === msg.id && (
                    <div className="absolute flex gap-1 p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-10">
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
              </div>
            ))
          )}

          {/* Typing indicator */}
          {typingIndicator && (
            <div className="text-sm text-[var(--muted)] italic flex items-center gap-2">
              <span>{recipientName} is typing</span>
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area - fixed at bottom */}
        <div className="border-t border-[var(--border)] p-4 space-y-2 flex-shrink-0">
          <MuteBanner mutedUntil={user?.mutedUntil} muteReason={user?.muteReason} />
          {/* Reply preview for quoted replies */}
          {replyingTo && (
            <div className="bg-[var(--bg-elevated)] border-l-2 border-[var(--primary)] p-2 rounded flex justify-between items-start text-xs">
              <div>
                <div className="font-semibold text-[var(--muted-strong)]">Replying to {replyingTo.senderId === user?.id ? 'You' : recipientName}</div>
                <div className="text-[var(--muted)] truncate max-w-xs">{replyingTo.message}</div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-[var(--muted)] hover:text-[var(--muted-strong)]"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={handleMessageChange}
              placeholder={placeholder}
              disabled={isInputBlocked}
              className="tt-input flex-1 focus:ring-[var(--primary)] disabled:bg-[var(--bg-elevated)]"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              aria-label={placeholder}
            />
            <button
              onClick={handleSendMessage}
              disabled={isInputBlocked || !messageText.trim()}
              className="tt-btn bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white px-4 py-2 text-sm disabled:opacity-70"
            >
              {sendButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
