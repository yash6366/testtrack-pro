import { io } from "socket.io-client";

let socket = null;
let listeners = new Map(); // Store event listeners for cleanup

/**
 * Initialize Socket.IO connection with user credentials
 * @param {string} token - JWT token from login
 * @param {string} userId - User ID
 * @param {string} userRole - User role (DEVELOPER, TESTER, ADMIN)
 * @returns {object} Socket instance
 */
export function connectSocket(token, userId, userRole) {
  if (socket?.connected) {
    return socket;
  }

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

  socket = io(apiUrl, {
    auth: {
      token,
      userId,
      role: userRole,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  // Connection events
  socket.on("connect", () => {
    // Connection established
  });

  socket.on("disconnect", (reason) => {
    // Disconnected from server
  });

  socket.on("error", (error) => {
    // Socket error occurred
  });

  socket.on("connect_error", (error) => {
    // Connection error occurred
  });

  return socket;
}

/**
 * Get existing socket connection
 * @returns {object} Socket instance or null
 */
export function getSocket() {
  return socket;
}

/**
 * Join a specific room (bug discussion, test execution, project, etc)
 * @param {string} room - Room name/ID
 */
export function joinRoom(room) {
  if (!socket) {
    console.error("Socket not connected");
    return;
  }
  socket.emit("joinRoom", room);
}

/**
 * Leave a room
 * @param {string} room - Room name/ID
 */
export function leaveRoom(room) {
  if (!socket) {
    console.error("Socket not connected");
    return;
  }
  socket.emit("leaveRoom", room);
}

/**
 * Send message to a room
 * @param {string} room - Room destination
 * @param {string} text - Message text
 * @param {string} type - GENERAL, BUG_DISCUSSION, TEST_EXECUTION, ANNOUNCEMENT
 * @param {object} metadata - Additional data like bugId, testId, etc
 */
export function sendMessage(room, text, type = "GENERAL", metadata = {}) {
  if (!socket) {
    console.error("Socket not connected");
    return;
  }

  socket.emit("message", {
    room,
    text,
    type,
    metadata,
  });
}

/**
 * Send direct notification to a user
 * @param {string} targetUserId - Recipient user ID
 * @param {string} type - RE_TEST_REQUEST, BUG_UPDATE, STATUS_CHANGE, GENERAL
 * @param {string} message - Notification text
 * @param {object} metadata - Additional context
 */
export function sendNotification(targetUserId, type, message, metadata = {}) {
  if (!socket) {
    console.error("Socket not connected");
    return;
  }

  socket.emit("notification", {
    targetUserId,
    type,
    message,
    metadata,
  });
}

/**
 * Emit typing indicator
 * @param {string} room - Room where user is typing
 */
export function emitTyping(room) {
  if (!socket) {
    console.error("Socket not connected");
    return;
  }
  socket.emit("typing", { room });
}

/**
 * Emit stop typing indicator
 * @param {string} room - Room where user stopped typing
 */
export function emitStopTyping(room) {
  if (!socket) {
    console.error("Socket not connected");
    return;
  }
  socket.emit("stopTyping", { room });
}

/**
 * Listen to incoming messages
 * @param {function} callback - Called with message data
 * @returns {function} Unsubscribe function
 */
export function onMessage(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("message", callback);

  // Return unsubscribe function
  return () => {
    if (currentSocket) {
      currentSocket.off("message", callback);
    }
  };
}

/**
 * Listen to incoming notifications
 * @param {function} callback - Called with notification data
 * @returns {function} Unsubscribe function
 */
export function onNotification(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("notification:new", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("notification:new", callback);
    }
  };
}

/**
 * Listen to admin message deletion events
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onMessageDeleted(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("message_deleted", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("message_deleted", callback);
    }
  };
}

/**
 * Listen to admin mute/unmute events
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onUserMuted(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("user_muted", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("user_muted", callback);
    }
  };
}

export function onUserUnmuted(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("user_unmuted", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("user_unmuted", callback);
    }
  };
}

/**
 * Listen to admin channel lock/disable events
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onChannelLocked(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("channel_locked", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("channel_locked", callback);
    }
  };
}

export function onChannelUnlocked(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("channel_unlocked", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("channel_unlocked", callback);
    }
  };
}

export function onChatDisabled(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("chat_disabled", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("chat_disabled", callback);
    }
  };
}

export function onChatEnabled(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("chat_enabled", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("chat_enabled", callback);
    }
  };
}

/**
 * Listen to user joined events
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onUserJoined(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("userJoined", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("userJoined", callback);
    }
  };
}

/**
 * Listen to user left events
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onUserLeft(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("userLeft", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("userLeft", callback);
    }
  };
}

/**
 * Listen to user typing events
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onUserTyping(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("userTyping", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("userTyping", callback);
    }
  };
}

/**
 * Listen to user stopped typing events
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onUserStoppedTyping(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("userStoppedTyping", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("userStoppedTyping", callback);
    }
  };
}

/**
 * Listen to announcements (admin only)
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onAnnouncement(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("announcement", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("announcement", callback);
    }
  };
}

/**
 * Listen to reaction events
 * @param {function} callback - Called with reaction data { type, messageId, reaction, userId, emoji }
 * @returns {function} Unsubscribe function
 */
export function onReaction(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  const handleAdd = (data) => callback({ type: 'add', ...data });
  const handleRemove = (data) => callback({ type: 'remove', ...data });

  currentSocket.on("reaction_add", handleAdd);
  currentSocket.on("reaction_remove", handleRemove);
  currentSocket.on("reaction_added", handleAdd);
  currentSocket.on("reaction_removed", handleRemove);

  return () => {
    if (currentSocket) {
      currentSocket.off("reaction_add", handleAdd);
      currentSocket.off("reaction_remove", handleRemove);
      currentSocket.off("reaction_added", handleAdd);
      currentSocket.off("reaction_removed", handleRemove);
    }
  };
}

/**
 * Listen to user presence events
 * @param {function} callback - Called with presence data { type, userId, userName, userRole, onlineUsers }
 * @returns {function} Unsubscribe function
 */
export function onUserPresence(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  const handleOnline = (data) => callback({ type: 'joined', ...data });
  const handleOffline = (data) => callback({ type: 'left', ...data });

  currentSocket.on("user_joined", handleOnline);
  currentSocket.on("user_left", handleOffline);
  currentSocket.on("user_online", handleOnline);
  currentSocket.on("user_offline", handleOffline);

  return () => {
    if (currentSocket) {
      currentSocket.off("user_joined", handleOnline);
      currentSocket.off("user_left", handleOffline);
      currentSocket.off("user_online", handleOnline);
      currentSocket.off("user_offline", handleOffline);
    }
  };
}

/**
 * Listen to channel creation events
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onChannelCreated(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("channel_created", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("channel_created", callback);
    }
  };
}

/**
 * Listen to channel archive events
 * @param {function} callback
 * @returns {function} Unsubscribe function
 */
export function onChannelArchived(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("channel_archived", callback);

  return () => {
    if (currentSocket) {
      currentSocket.off("channel_archived", callback);
    }
  };
}

/**
 * Listen to pinned message events
 * @param {function} callback - Called with pinned message data
 * @returns {function} Unsubscribe function
 */
export function onPinnedMessage(callback) {
  if (!socket) {
    console.error("Socket not connected");
    return () => {};
  }

  const currentSocket = socket;
  currentSocket.on("message_pinned", (data) => callback({ type: 'pinned', ...data }));
  currentSocket.on("message_unpinned", (data) => callback({ type: 'unpinned', ...data }));

  return () => {
    if (currentSocket) {
      currentSocket.off("message_pinned", callback);
      currentSocket.off("message_unpinned", callback);
    }
  };
}

/**
 * Send a reaction to a message via HTTP
 * @param {number} messageId - Message ID
 * @param {string} emoji - Emoji to react with
 * @param {string} action - 'add' or 'remove'
 */
export async function sendReaction(messageId, emoji, action = 'add') {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ emoji, action }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send reaction');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending reaction:', error);
    throw error;
  }
}

/**
 * Send a reply to a message via HTTP
 * @param {number} messageId - Original message ID to reply to
 * @param {number} channelId - Channel ID
 * @param {string} body - Reply message text
 */
export async function sendReply(messageId, channelId, body) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat/messages/${messageId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ channelId, body }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send reply');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending reply:', error);
    throw error;
  }
}

/**
 * Get reactions for a message
 * @param {number} messageId - Message ID
 */
export async function getReactions(messageId) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat/messages/${messageId}/reactions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get reactions');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting reactions:', error);
    throw error;
  }
}

/**
 * Get pinned messages for channel
 * @param {number} channelId - Channel ID
 */
export async function getPinnedMessages(channelId) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat/channels/${channelId}/pinned`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get pinned messages');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting pinned messages:', error);
    throw error;
  }
}

/**
 * Pin a message (Admin only)
 * @param {number} messageId - Message ID
 */
export async function pinMessage(messageId) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat/messages/${messageId}/pin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to pin message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error pinning message:', error);
    throw error;
  }
}

/**
 * Unpin a message (Admin only)
 * @param {number} messageId - Message ID
 */
export async function unpinMessage(messageId) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat/messages/${messageId}/pin`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to unpin message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error unpinning message:', error);
    throw error;
  }
}

/**
 * Get channel members with online status
 * @param {number} channelId - Channel ID
 */
export async function getChannelMembers(channelId) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/chat/channels/${channelId}/members`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get channel members');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting channel members:', error);
    throw error;
  }
}

/**
 * Send a direct message to another user
 * @param {number} recipientId - Recipient user ID
 * @param {string} message - Message text
 * @param {Function} onAck - Optional acknowledgment callback
 */
export function sendDirectMessage(recipientId, message, replyToId = null, onAck) {
  if (!socket?.connected) {
    throw new Error('Socket not connected');
  }
  
  socket.emit('dm_message', {
    recipientId,
    message,
    replyToId,
  }, onAck);
}

/**
 * Mark DMs from a user as read
 * @param {number} senderId - Sender user ID
 */
export function markDMRead(senderId) {
  if (!socket?.connected) {
    console.warn('Socket not connected - DM read status may not update');
    return;
  }
  
  socket.emit('dm_read', {
    senderId,
  });
}

/**
 * Emit DM typing indicator
 * @param {number} recipientId - Recipient user ID
 * @param {string} userName - User's name for display
 */
export function emitDMTyping(recipientId, userName) {
  if (!socket?.connected) {
    return;
  }
  
  socket.emit('dm_typing', {
    recipientId,
    userName,
  });
}

/**
 * Emit DM stop typing indicator
 * @param {number} recipientId - Recipient user ID
 */
export function emitDMStopTyping(recipientId) {
  if (!socket?.connected) {
    return;
  }
  
  socket.emit('dm_stop_typing', {
    recipientId,
  });
}

/**
 * Listen for incoming direct messages
 * @param {Function} callback - Function to handle incoming DM
 * @returns {Function} Unsubscribe function
 */
export function onDirectMessage(callback) {
  if (!socket) return () => {};

  const currentSocket = socket;
  currentSocket.on('dm_message', callback);

  return () => {
    if (currentSocket) {
      currentSocket.off('dm_message', callback);
    }
  };
}

/**
 * Listen for DM read status updates
 * @param {Function} callback - Function to handle read status
 * @returns {Function} Unsubscribe function
 */
export function onDMRead(callback) {
  if (!socket) return () => {};

  const currentSocket = socket;
  currentSocket.on('dm_read', callback);

  return () => {
    if (currentSocket) {
      currentSocket.off('dm_read', callback);
    }
  };
}

/**
 * Listen for DM typing indicators
 * @param {Function} callback - Function to handle typing status
 * @returns {Function} Unsubscribe function
 */
export function onDMTyping(callback) {
  if (!socket) return () => {};

  const currentSocket = socket;
  currentSocket.on('dm_typing', callback);

  return () => {
    if (currentSocket) {
      currentSocket.off('dm_typing', callback);
    }
  };
}

/**
 * Listen for DM stop typing indicators
 * @param {Function} callback - Function to handle stop typing status
 * @returns {Function} Unsubscribe function
 */
export function onDMStopTyping(callback) {
  if (!socket) return () => {};

  const currentSocket = socket;
  currentSocket.on('dm_stop_typing', callback);

  return () => {
    if (currentSocket) {
      currentSocket.off('dm_stop_typing', callback);
    }
  };
}

/**
 * Disconnect socket gracefully
 */
export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
    console.log("✓ Socket disconnected");
  }
  socket = null;
}

/**
 * Check if socket is connected
 * @returns {boolean}
 */
export function isSocketConnected() {
  return socket?.connected ?? false;
}
