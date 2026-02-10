import { useEffect, useCallback, useState, useRef } from "react";
import {
  connectSocket,
  getSocket,
  joinRoom,
  leaveRoom,
  sendMessage,
  sendNotification,
  emitTyping,
  emitStopTyping,
  onMessage,
  onNotification,
  onUserJoined,
  onUserLeft,
  onUserTyping,
  onUserStoppedTyping,
  disconnectSocket,
  isSocketConnected,
} from "../lib/socketClient.js";

/**
 * Hook for Socket.IO communication
 * @param {string} userId - Current user ID
 * @param {string} userRole - Current user role
 * @param {string} token - JWT token
 * @returns {object} Socket utilities and events
 */
export function useSocket(userId, userRole, token) {
  const [connected, setConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Map());
  const unsubscribeRefs = useRef([]);

  // Connect socket on mount
  useEffect(() => {
    if (!userId || !token) return;

    const socket = connectSocket(token, userId, userRole);

    const handleConnect = () => {
      setConnected(true);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Check if already connected
    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [userId, token, userRole]);

  // Join room and setup listeners
  const setupRoom = useCallback(
    (room) => {
      const socket = getSocket();
      if (!socket) return;

      joinRoom(room);

      // User joined listener
      const unsubJoined = onUserJoined((data) => {
        if (data.room === room) {
          setRoomUsers((prev) => {
            const updated = new Map(prev);
            if (!updated.has(room)) {
              updated.set(room, new Set());
            }
            updated.get(room).add(data.userId);
            return updated;
          });
        }
      });

      // User left listener
      const unsubLeft = onUserLeft((data) => {
        if (data.room === room) {
          setRoomUsers((prev) => {
            const updated = new Map(prev);
            if (updated.has(room)) {
              updated.get(room).delete(data.userId);
            }
            return updated;
          });
        }
      });

      // Typing listener
      const unsubTyping = onUserTyping((data) => {
        if (data.room === room) {
          setTypingUsers((prev) => {
            const updated = new Map(prev);
            if (!updated.has(room)) {
              updated.set(room, new Set());
            }
            updated.get(room).add(data.userId);
            return updated;
          });
        }
      });

      // Stop typing listener
      const unsubStopTyping = onUserStoppedTyping((data) => {
        if (data.room === room) {
          setTypingUsers((prev) => {
            const updated = new Map(prev);
            if (updated.has(room)) {
              updated.get(room).delete(data.userId);
              if (updated.get(room).size === 0) {
                updated.delete(room);
              }
            }
            return updated;
          });
        }
      });

      // Store unsubscribers
      unsubscribeRefs.current.push(unsubJoined, unsubLeft, unsubTyping, unsubStopTyping);

      return () => {
        leaveRoom(room);
        setRoomUsers((prev) => {
          const updated = new Map(prev);
          updated.delete(room);
          return updated;
        });
        setTypingUsers((prev) => {
          const updated = new Map(prev);
          updated.delete(room);
          return updated;
        });
        unsubJoined();
        unsubLeft();
        unsubTyping();
        unsubStopTyping();
      };
    },
    []
  );

  // Send message utility
  const sendMsg = useCallback((room, text, type = "GENERAL", metadata = {}) => {
    sendMessage(room, text, type, metadata);
  }, []);

  // Send notification utility
  const notifyUser = useCallback((targetUserId, type, message, metadata = {}) => {
    sendNotification(targetUserId, type, message, metadata);
  }, []);

  // Typing utilities
  const indicateTyping = useCallback((room) => {
    emitTyping(room);
  }, []);

  const indicateStopTyping = useCallback((room) => {
    emitStopTyping(room);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeRefs.current.forEach((unsub) => unsub?.());
      disconnectSocket();
    };
  }, []);

  return {
    connected,
    setupRoom,
    sendMsg,
    notifyUser,
    indicateTyping,
    indicateStopTyping,
    roomUsers,
    typingUsers,
    getSocket,
    joinRoom,
    leaveRoom,
    onMessage,
    onNotification,
    onUserJoined,
    onUserLeft,
    onUserTyping,
    onUserStoppedTyping,
  };
}
