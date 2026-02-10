import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from '@/components/ThemeToggle';
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../hooks";
import { useSocket } from "../hooks/useSocket";

export default function Chat() {
  const { user, token } = useAuth();
  const {
    connected,
    setupRoom,
    onMessage,
    roomUsers,
    typingUsers,
    indicateTyping,
    indicateStopTyping,
    sendMsg,
  } = useSocket(user?.id, user?.role, token);

  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [channelError, setChannelError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId),
    [channels, activeChannelId]
  );

  // Load channels on mount
  useEffect(() => {
    let isActive = true;

    const loadChannels = async () => {
      setLoadingChannels(true);
      setChannelError("");
      try {
        const response = await apiClient.get("/api/chat/channels");
        if (!isActive) return;
        setChannels(response.channels || []);
        if (response.channels?.length) {
          setActiveChannelId(response.channels[0].id);
        }
      } catch (error) {
        if (!isActive) return;
        const message =
          error instanceof Error ? error.message : "Failed to load channels";
        setChannelError(message);
      } finally {
        if (isActive) setLoadingChannels(false);
      }
    };

    loadChannels();

    return () => {
      isActive = false;
    };
  }, []);

  // Load messages for active channel
  useEffect(() => {
    if (!activeChannelId) return;

    let isActive = true;

    const loadMessages = async () => {
      setLoadingMessages(true);
      setMessageError("");
      try {
        const response = await apiClient.get(
          `/api/chat/channels/${activeChannelId}/messages`
        );
        if (!isActive) return;
        setMessages(response.messages || []);
      } catch (error) {
        if (!isActive) return;
        const message =
          error instanceof Error ? error.message : "Failed to load messages";
        setMessageError(message);
      } finally {
        if (isActive) setLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      isActive = false;
    };
  }, [activeChannelId]);

  // Setup Socket.IO room for active channel
  useEffect(() => {
    if (!connected || !activeChannelId) return;

    const roomName = `channel-${activeChannelId}`;
    const cleanup = setupRoom(roomName);

    // Listen for new messages
    const unsubscribe = onMessage((msg) => {
      if (msg.room !== roomName) {
        return;
      }

      const normalized = {
        id: msg.id,
        senderId: msg.senderId ?? msg.userId,
        senderName: msg.sender?.name,
        body: msg.body ?? msg.text,
        createdAt: msg.createdAt ?? msg.timestamp,
      };

      if (!normalized.body || !normalized.senderId) {
        return;
      }

      setMessages((prev) => [...prev, normalized]);
    });

    return () => {
      cleanup?.();
      unsubscribe?.();
    };
  }, [connected, activeChannelId, setupRoom, onMessage]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!newMessage.trim() || !activeChannelId) return;

    const body = newMessage.trim();
    setNewMessage("");
    indicateStopTyping(`channel-${activeChannelId}`);
    setIsTyping(false);

    try {
      sendMsg(`channel-${activeChannelId}`, body, "GENERAL", {
        channelId: activeChannelId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send message";
      setMessageError(message);
    }
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!activeChannelId) return;

    // Emit typing indicator
    if (!isTyping && value.length > 0) {
      indicateTyping(`channel-${activeChannelId}`);
      setIsTyping(true);
    }

    // Clear typing after user stops
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      indicateStopTyping(`channel-${activeChannelId}`);
      setIsTyping(false);
    }, 3000);
  };

  const handleCreateChannel = async (event) => {
    event.preventDefault();
    if (!newChannel.trim()) return;

    try {
      const response = await apiClient.post("/api/chat/channels", {
        name: newChannel.trim(),
      });
      setChannels((current) => [response.channel, ...current]);
      setActiveChannelId(response.channel.id);
      setNewChannel("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create channel";
      setChannelError(message);
    }
  };

  const handleInviteMember = async (event) => {
    event.preventDefault();
    if (!inviteInput.trim() || !activeChannelId) return;

    setInviteError("");
    setInviteSuccess("");

    const raw = inviteInput.trim();
    const payload = raw.includes("@")
      ? { email: raw }
      : { userId: Number(raw) };

    if (!payload.email && Number.isNaN(payload.userId)) {
      setInviteError("Enter a valid email or numeric user ID.");
      return;
    }

    try {
      const response = await apiClient.post(
        `/api/chat/channels/${activeChannelId}/members`,
        payload
      );
      setInviteSuccess(response.message || "Member added.");
      setInviteInput("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add member";
      setInviteError(message);
    }
  };

  const activeRoomName = activeChannelId ? `channel-${activeChannelId}` : null;
  const roomMembersCount = activeRoomName
    ? roomUsers.get(activeRoomName)?.size || 0
    : 0;
  const typingUsersInRoom = activeRoomName
    ? typingUsers.get(activeRoomName) || new Set()
    : new Set();

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--surface-strong)] border border-[var(--border)] flex items-center justify-center font-bold">
              TT
            </div>
            <div>
              <h1 className="text-lg font-semibold">Team Communication</h1>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="tt-pill">Chat hub</span>
                {connected && <span className="text-[var(--success)]">Connected</span>}
                {!connected && <span className="text-[var(--warning)]">Connecting...</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted)]">{user?.email}</span>
            <ThemeToggle />
            <Link to="/dashboard" className="tt-btn tt-btn-outline px-4 py-2 text-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channels Sidebar */}
        <div className="tt-card p-6">
          <h2 className="text-lg font-semibold mb-4">Channels</h2>

          {channelError && (
            <div className="tt-card-soft border border-[var(--danger)] text-[var(--danger)] px-3 py-2 rounded-xl mb-4 text-sm">
              {channelError}
            </div>
          )}

          {/* Create Channel Form */}
          <form onSubmit={handleCreateChannel} className="flex gap-2 mb-4">
            <input
              id="chat-new-channel"
              name="newChannel"
              value={newChannel}
              onChange={(event) => setNewChannel(event.target.value)}
              className="tt-input flex-1"
              placeholder="New channel name"
              aria-label="New channel name"
            />
            <button
              type="submit"
              className="tt-btn tt-btn-primary px-3 py-2 text-sm"
            >
              +
            </button>
          </form>

          {activeChannel?.type === "CHANNEL" && (
            <form onSubmit={handleInviteMember} className="space-y-2 mb-4">
              <input
                id="chat-invite-member"
                name="inviteMember"
                value={inviteInput}
                onChange={(event) => setInviteInput(event.target.value)}
                className="tt-input"
                placeholder="Invite by email or user ID"
                aria-label="Invite by email or user ID"
              />
              <button
                type="submit"
                className="tt-btn tt-btn-outline w-full py-2 text-sm"
              >
                Add Member
              </button>
              {inviteError && <p className="text-xs text-[var(--danger)]">{inviteError}</p>}
              {inviteSuccess && <p className="text-xs text-[var(--success)]">{inviteSuccess}</p>}
            </form>
          )}

          {/* Channels List */}
          {loadingChannels && <p className="text-sm text-[var(--muted)]">Loading channels...</p>}
          {!loadingChannels && channels.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No channels yet.</p>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {channels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => setActiveChannelId(channel.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition border ${
                  channel.id === activeChannelId
                    ? "bg-[var(--surface-strong)] text-[var(--primary)] border-[var(--primary)]"
                    : "border-transparent hover:bg-[var(--bg-elevated)] text-[var(--muted-strong)]"
                }`}
              >
                <span className="mr-2">{channel.type === "DIRECT" ? "👤" : "#"}</span>
                {channel.name || "Direct Chat"}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-2 tt-card p-6 flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {activeChannel?.type === "DIRECT" ? "👤 " : "# "}
                {activeChannel?.name || "Select a channel"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {activeChannel?.type === "DIRECT"
                  ? "Direct conversation"
                  : `${roomMembersCount || "?"} members in room`}
              </p>
            </div>
            {loadingMessages && <span className="text-xs text-[var(--muted)]">Loading messages...</span>}
          </div>

          {messageError && (
            <div className="tt-card-soft border border-[var(--danger)] text-[var(--danger)] px-3 py-2 rounded-xl mb-4 text-sm">
              {messageError}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto mb-4 pr-2">
            {messages.length === 0 && !loadingMessages && (
              <p className="text-sm text-[var(--muted)] text-center py-8">
                No messages yet. Start the conversation!
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-2xl border ${
                  message.senderId === user?.id
                    ? "bg-[var(--surface-strong)] border-[var(--primary)] ml-8"
                    : "bg-[var(--bg-elevated)] border-[var(--border)] mr-8"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-semibold">
                    {message.senderId === user?.id
                      ? "You"
                      : message.sender?.name ||
                        message.senderName ||
                        `User ${String(message.senderId).slice(0, 8)}`}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted-strong)]">{message.body}</p>
              </div>
            ))}

            {/* Typing Indicators */}
            {typingUsersInRoom.size > 0 && (
              <div className="text-sm text-[var(--muted)] italic py-2">
                {Array.from(typingUsersInRoom).slice(0, 3).join(", ")}{" "}
                {typingUsersInRoom.size > 3
                  ? `and ${typingUsersInRoom.size - 3} more `
                  : ""}
                is typing...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              id="chat-message"
              name="message"
              value={newMessage}
              onChange={handleMessageChange}
              className="tt-input flex-1"
              placeholder="Type your message..."
              disabled={!activeChannelId || !connected}
              aria-label="Message"
            />
            <button
              type="submit"
              className="tt-btn tt-btn-primary px-4 py-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={!activeChannelId || !connected || !newMessage.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
