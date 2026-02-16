import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/apiClient';

/**
 * NotificationCenter Component
 * Displays notifications in a dropdown, with bell icon and unread count
 */
export default function NotificationCenter() {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await apiClient.get('/api/notifications?take=10');
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch on mount and when opened
  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      // Refetch every 30 seconds while open
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await apiClient.patch(
        `/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.patch(
        '/api/notifications/mark-all-read',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await apiClient.delete(
        `/api/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      BUG_CREATED: '🐛',
      BUG_ASSIGNED: '👤',
      BUG_STATUS_CHANGED: '📊',
      BUG_COMMENTED: '💬',
      TESTCASE_EXECUTED: '✅',
      TEST_EXECUTION_FAILED: '❌',
      USER_MENTIONED: '👉',
      ANNOUNCEMENT: '📢',
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type) => {
    const colors = {
      BUG_CREATED: 'bg-red-50 border-l-4 border-red-400',
      BUG_ASSIGNED: 'bg-blue-50 border-l-4 border-blue-400',
      BUG_STATUS_CHANGED: 'bg-purple-50 border-l-4 border-purple-400',
      BUG_COMMENTED: 'bg-yellow-50 border-l-4 border-yellow-400',
      TESTCASE_EXECUTED: 'bg-green-50 border-l-4 border-green-400',
      TEST_EXECUTION_FAILED: 'bg-orange-50 border-l-4 border-orange-400',
      ANNOUNCEMENT: 'bg-indigo-50 border-l-4 border-indigo-400',
    };
    return colors[type] || 'bg-gray-50 border-l-4 border-gray-400';
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    // Navigate to action URL if provided
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
        title="Notifications"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 bg-[var(--surface)] rounded-lg shadow-lg border border-[var(--border)] z-50 flex flex-col">
          {/* Header */}
          <div className="sticky top-0 p-4 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[var(--muted)]">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-[var(--muted)]">
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">You're all caught up! 🎉</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-3 hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors ${
                      !notif.isRead ? 'bg-blue-50/50' : ''
                    } ${getNotificationColor(notif.type)}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0 mt-1">
                        {getNotificationIcon(notif.type)}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-[var(--text)]">
                            {notif.title}
                          </h4>
                          {!notif.isRead && (
                            <span className="inline-block h-2 w-2 bg-[var(--primary)] rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>

                        <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-[var(--muted)]">
                            {formatTimeAgo(new Date(notif.createdAt))}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notif.id);
                            }}
                            className="text-xs text-[var(--muted)] hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="sticky bottom-0 p-3 border-t border-[var(--border)] bg-[var(--bg-elevated)] text-center">
              <a
                href="/notifications"
                className="text-sm text-[var(--primary)] hover:underline font-medium"
              >
                View all notifications →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Close when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Helper function to format time ago
 */
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}
