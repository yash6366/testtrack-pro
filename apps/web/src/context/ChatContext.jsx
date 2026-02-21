import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth, useSocket } from '@/hooks';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const { token, user } = useAuth();
  const {
    onChannelLocked,
    onChannelUnlocked,
    onChatDisabled,
    onChatEnabled,
    onChannelCreated,
    onChannelArchived,
    onMessage,
    joinRoom,
  } = useSocket(user?.id, user?.role, token);
  const [directMessages, setDirectMessages] = useState({});
  const [conversations, setConversations] = useState([]);
  const [channels, setChannels] = useState({
    general: [],
    roleChannels: [],
    projects: [],
  });
  const [channelUnreadCounts, setChannelUnreadCounts] = useState({});
  // Store archived project channels separately for admin review.
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const typingTimeoutRef = useRef({});
  const joinedChannelsRef = useRef(new Set());
  const activeChannelRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  /**
   * Load all conversations for the current user
   */
  const loadConversations = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiUrl}/api/dm/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  /**
   * Load messages for a specific DM conversation
   * @param {number} userId - Recipient user ID
   * @param {number} limit - Number of messages to fetch (default 50)
   * @param {number} offset - Pagination offset
   */
  const loadDMConversation = useCallback(
    async (userId, limit = 50, offset = 0) => {
      if (!token || !userId) return;

      try {
        const response = await fetch(
          `${apiUrl}/api/dm/${userId}/messages?limit=${limit}&offset=${offset}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load DM conversation');
        }

        const data = await response.json();
        
        // Update messages state
        setDirectMessages((prev) => ({
          ...prev,
          [userId]: data.messages || [],
        }));

        return data.messages || [];
      } catch (err) {
        console.error(`Error loading DM conversation with user ${userId}:`, err);
      }
    },
    [token, apiUrl]
  );

  /**
   * Send a direct message
   * @param {number} recipientId - Recipient user ID
   * @param {string} message - Message text
   */
  const sendDM = useCallback(
    async (recipientId, message) => {
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/api/dm/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipientId,
            message,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();

        // Update local messages state
        setDirectMessages((prev) => ({
          ...prev,
          [recipientId]: [...(prev[recipientId] || []), data],
        }));

        return data;
      } catch (err) {
        console.error('Error sending DM:', err);
        throw err;
      }
    },
    [token, apiUrl]
  );

  /**
   * Mark DMs from a user as read
   * @param {number} userId - Sender user ID
   */
  const markDMsRead = useCallback(
    async (userId) => {
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/api/dm/${userId}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to mark DMs as read');
        }

        // Update conversations to clear unread count
        setConversations((prev) =>
          prev.map((conv) =>
            conv.userId === userId ? { ...conv, unreadCount: 0 } : conv
          )
        );
      } catch (err) {
        console.error('Error marking DMs as read:', err);
      }
    },
    [token, apiUrl]
  );

  /**
   * Add or update a message reaction
   * @param {number} messageId - Message ID
   * @param {string} emoji - Emoji reaction
   * @param {boolean} add - Add or remove reaction
   */
  const reactToDM = useCallback(
    async (messageId, emoji, add = true) => {
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/api/dm/${messageId}/reactions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emoji,
            action: add ? 'add' : 'remove',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update reaction');
        }

        return await response.json();
      } catch (err) {
        console.error('Error reacting to DM:', err);
        throw err;
      }
    },
    [token, apiUrl]
  );

  /**
   * Load all channels (general, role-based, and project)
   */
  const loadChannels = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/channels`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load channels');
      }

      const data = await response.json();
      const grouped = data.channels || {};
      setChannels({
        general: grouped.general || [],
        roleChannels: grouped.roleChannels || [],
        projects: grouped.projects || [],
      });
    } catch (err) {
      setError(err.message);
      console.error('Error loading channels:', err);
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  /**
   * Load archived project channels (admin only)
   */
  // Admin-only fetch for archived project channels.
  const loadArchivedChannels = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/channels/archived`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load archived channels');
      }

      const data = await response.json();
      setArchivedProjects(data.channels || []);
    } catch (err) {
      console.error('Error loading archived channels:', err);
    }
  }, [token, apiUrl]);

  const updateChannelState = useCallback((channelId, patch) => {
    setChannels((prev) => ({
      general: prev.general.map((ch) => (ch.id === channelId ? { ...ch, ...patch } : ch)),
      roleChannels: prev.roleChannels.map((ch) => (ch.id === channelId ? { ...ch, ...patch } : ch)),
      projects: prev.projects.map((ch) => (ch.id === channelId ? { ...ch, ...patch } : ch)),
    }));
  }, []);

  // Keep the active channel in sync for unread count tracking.
  const setActiveChannelId = useCallback((channelId) => {
    activeChannelRef.current = channelId;
    if (channelId) {
      setChannelUnreadCounts((prev) => ({
        ...prev,
        [channelId]: 0,
      }));
    }
  }, []);

  /**
   * Create a new project channel (admin only)
   * @param {string} name - Channel name
   * @param {string[]} allowedRoles - Roles allowed to access
   * @param {string} projectName - Project display name
   * @param {number[]} allowedUserIds - Optional user access list
   */
  const createChannel = useCallback(
    async (name, allowedRoles = [], projectName = '', allowedUserIds = []) => {
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/api/channels/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            allowedRoles,
            projectName,
            allowedUserIds,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create channel');
        }

        const responseData = await response.json();
        const newChannel = responseData.channel;
        
        // Add to projects list
        if (newChannel) {
          setChannels((prev) => ({
            ...prev,
            projects: [...prev.projects, newChannel],
          }));
        }

        return newChannel;
      } catch (err) {
        console.error('Error creating channel:', err);
        throw err;
      }
    },
    [token, apiUrl]
  );

  /**
   * Archive or restore a channel (admin only)
   * @param {number} channelId - Channel ID
   * @param {boolean} archive - Archive or restore
   */
  const toggleChannelArchive = useCallback(
    async (channelId, archive = true) => {
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/api/channels/${channelId}/archive`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            archived: archive,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update channel');
        }

        const updatedChannel = await response.json();
        const channelData = updatedChannel?.channel || updatedChannel;
        
        // Update channels list
        setChannels((prev) => ({
          ...prev,
          projects: prev.projects.map((ch) =>
            ch.id === channelId ? channelData : ch
          ),
        }));

        return channelData;
      } catch (err) {
        console.error('Error updating channel:', err);
        throw err;
      }
    },
    [token, apiUrl]
  );

  /**
   * Check if user can access a channel
   * @param {number} channelId - Channel ID
   */
  const canAccessChannel = useCallback(
    async (channelId) => {
      if (!token) return false;

      try {
        const response = await fetch(`${apiUrl}/api/channels/${channelId}/access`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        return data.hasAccess || false;
      } catch (err) {
        console.error('Error checking channel access:', err);
        return false;
      }
    },
    [token, apiUrl]
  );

  // Load conversations and channels on mount
  useEffect(() => {
    if (token && user) {
      loadConversations();
      loadChannels();
    }
  }, [token, user, loadConversations, loadChannels]);

  useEffect(() => {
    if (!onChannelLocked || !onChannelUnlocked || !onChatDisabled || !onChatEnabled || !onChannelCreated || !onChannelArchived) {
      return undefined;
    }

    const unsubLocked = onChannelLocked((data) => {
      if (data?.channelId) {
        updateChannelState(Number(data.channelId), { isLocked: true });
      }
    });

    const unsubUnlocked = onChannelUnlocked((data) => {
      if (data?.channelId) {
        updateChannelState(Number(data.channelId), { isLocked: false });
      }
    });

    const unsubDisabled = onChatDisabled((data) => {
      if (data?.channelId) {
        updateChannelState(Number(data.channelId), { isDisabled: true });
      }
    });

    const unsubEnabled = onChatEnabled((data) => {
      if (data?.channelId) {
        updateChannelState(Number(data.channelId), { isDisabled: false });
      }
    });

    // Keep the sidebar in sync with channel create/archive events.
    const unsubCreated = onChannelCreated((data) => {
      if (!data?.channel) return;
      setChannels((prev) => {
        const exists = prev.projects.some((ch) => ch.id === data.channel.id);
        if (exists) {
          return prev;
        }
        return {
          ...prev,
          projects: [...prev.projects, data.channel],
        };
      });
    });

    const unsubArchived = onChannelArchived((data) => {
      if (!data?.channelId) return;
      const channelId = Number(data.channelId);
      if (data.archived) {
        setChannels((prev) => ({
          ...prev,
          projects: prev.projects.filter((ch) => ch.id !== channelId),
        }));
      }
      loadArchivedChannels();
    });

    return () => {
      unsubLocked?.();
      unsubUnlocked?.();
      unsubDisabled?.();
      unsubEnabled?.();
      unsubCreated?.();
      unsubArchived?.();
    };
  }, [onChannelLocked, onChannelUnlocked, onChatDisabled, onChatEnabled, onChannelCreated, onChannelArchived, updateChannelState, loadArchivedChannels]);

  useEffect(() => {
    if (!joinRoom || !onMessage) {
      return undefined;
    }

    const allChannels = [
      ...(channels.general || []),
      ...(channels.roleChannels || []),
      ...(channels.projects || []),
    ];

    allChannels.forEach((channel) => {
      if (!joinedChannelsRef.current.has(channel.id)) {
        joinRoom(`channel-${channel.id}`);
        joinedChannelsRef.current.add(channel.id);
      }
    });

    // Update unread counts when new messages arrive in inactive channels.
    const unsubscribe = onMessage((msg) => {
      if (!msg?.channelId) return;
      if (activeChannelRef.current === msg.channelId) return;
      setChannelUnreadCounts((prev) => ({
        ...prev,
        [msg.channelId]: (prev[msg.channelId] || 0) + 1,
      }));
    });

    return () => {
      unsubscribe?.();
    };
  }, [channels, joinRoom, onMessage]);

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  const value = {
    // Direct Messages
    directMessages,
    conversations,
    loadConversations,
    loadDMConversation,
    sendDM,
    markDMsRead,
    reactToDM,

    // Channels
    channels,
    loadChannels,
    createChannel,
    toggleChannelArchive,
    canAccessChannel,
    archivedProjects,
    loadArchivedChannels,
    channelUnreadCounts,
    setActiveChannelId,

    // UI State
    loading,
    error,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Hook to use Chat context
 */
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
