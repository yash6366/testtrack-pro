import { useEffect, useRef, useState } from 'react';
import { useAuth, useSocket } from '@/hooks';

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
}) {
  const { user, token } = useAuth();
  const {
    connected,
    sendMsg,
    onMessage,
    setupRoom,
    typingUsers,
    indicateTyping,
    indicateStopTyping,
  } = useSocket(user?.id, user?.role, token);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachmentState, setAttachmentState] = useState(null);
  const typingTimeoutRef = useRef(null);

  const room = `${roomPrefix}-${roomId}`;
  const messageInputId = `discussion-${roomPrefix}-${roomId}-message`;
  const attachmentInputId = `discussion-${roomPrefix}-${roomId}-attachment`;
  const typingUsersInRoom = typingUsers.get(room) || new Set();
  const themeStyles = THEMES[theme] ?? THEMES.blue;

  useEffect(() => {
    if (!connected) return;

    const cleanup = setupRoom(room);
    const unsubscribe = onMessage((msg) => {
      if (msg.room === room) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      cleanup?.();
      unsubscribe?.();
    };
  }, [connected, room, setupRoom, onMessage]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !connected) return;

    const metadata = allowAttachments && attachmentState?.metadata
      ? attachmentState.metadata
      : {};

    sendMsg(room, messageText, messageType, metadata);
    setMessageText('');
    setAttachmentState(null);
    indicateStopTyping(room);
    setIsTyping(false);
  };

  const handleMessageChange = (e) => {
    const nextValue = e.target.value;
    setMessageText(nextValue);

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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="tt-card w-full max-w-2xl max-h-[540px] flex flex-col">
        <div className="border-b border-[var(--border)] p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-[var(--muted)]">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--muted-strong)] font-bold text-lg">
            {closeLabel}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!connected && <div className="text-center text-[var(--warning)] py-4">{connectingMessage}</div>}

          {messages.length === 0 ? (
            <div className="text-center text-[var(--muted)] py-8">{emptyMessage}</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-2xl border ${
                  msg.userId === user?.id
                    ? themeStyles.bubbleSelf
                    : 'bg-[var(--bg-elevated)] border-[var(--border)] mr-8'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold">
                    {msg.userId === user?.id ? 'You' : `${roleLabel} ${msg.userId?.slice(0, 8)}`}
                  </p>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[var(--muted-strong)] mt-1">{msg.text}</p>
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
              </div>
            ))
          )}

          {typingUsersInRoom.size > 0 && (
            <div className="text-sm text-[var(--muted)] italic">
              {Array.from(typingUsersInRoom).join(', ')} is typing...
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] p-4 space-y-2">
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
          <div className="flex gap-2">
            <input
              id={messageInputId}
              name="message"
              type="text"
              value={messageText}
              onChange={handleMessageChange}
              placeholder={placeholder}
              disabled={!connected}
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
              disabled={!connected || !messageText.trim()}
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
