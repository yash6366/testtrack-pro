import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/apiClient';
import { useSocket } from '../hooks/useSocket';

/**
 * NotificationToast Component
 * Displays incoming real-time notifications as toasts
 */
export default function NotificationToast() {
  const { user, token } = useAuth();
  const [toasts, setToasts] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !user) return;

    // Listen for real-time notifications
    socket.on('notification:new', (notification) => {
      const toastId = Date.now();
      const toast = {
        id: toastId,
        ...notification,
      };

      setToasts(prev => [toast, ...prev]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 5000);
    });

    return () => {
      socket.off('notification:new');
    };
  }, [socket, user]);

  const handleDismiss = (toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  };

  const handleAction = async (notification) => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }

    // Mark as read
    if (notification.id) {
      try {
        await apiClient.patch(
          `/notifications/${notification.id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const getToastBg = (type) => {
    const colors = {
      BUG_CREATED: 'bg-red-50 border-red-200',
      BUG_ASSIGNED: 'bg-blue-50 border-blue-200',
      BUG_STATUS_CHANGED: 'bg-purple-50 border-purple-200',
      TEST_EXECUTION_FAILED: 'bg-orange-50 border-orange-200',
      ANNOUNCEMENT: 'bg-green-50 border-green-200',
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  const getToastTextColor = (type) => {
    const colors = {
      BUG_CREATED: 'text-red-900',
      BUG_ASSIGNED: 'text-blue-900',
      BUG_STATUS_CHANGED: 'text-purple-900',
      TEST_EXECUTION_FAILED: 'text-orange-900',
      ANNOUNCEMENT: 'text-green-900',
    };
    return colors[type] || 'text-gray-900';
  };

  const getIcon = (type) => {
    const icons = {
      BUG_CREATED: '🐛',
      BUG_ASSIGNED: '👤',
      BUG_STATUS_CHANGED: '📊',
      BUG_COMMENTED: '💬',
      TEST_EXECUTION_FAILED: '❌',
      TEST_SUITE_COMPLETED: '✅',
      USER_MENTIONED: '👉',
      ANNOUNCEMENT: '📢',
    };
    return icons[type] || '📝';
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            p-4 rounded-lg border shadow-lg animate-slide-in
            ${getToastBg(toast.type)} ${getToastTextColor(toast.type)}
          `}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{getIcon(toast.type)}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">{toast.title}</h4>
              <p className="text-xs mt-1 opacity-90">{toast.message}</p>
            </div>
            <button
              onClick={() => handleDismiss(toast.id)}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {toast.actionUrl && (
            <button
              onClick={() => handleAction(toast)}
              className="mt-2 text-xs font-semibold px-3 py-1 rounded bg-white/50 hover:bg-white/80 w-full"
            >
              View Details
            </button>
          )}
        </div>
      ))}

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
