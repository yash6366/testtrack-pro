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
