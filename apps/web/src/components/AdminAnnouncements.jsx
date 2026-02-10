import { useState, useEffect } from "react";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../hooks/useAuth";

/**
 * AdminAnnouncements Component
 * Allows admins to broadcast system-wide announcements and notifications
 */
export default function AdminAnnouncements() {
  const { user, token } = useAuth();
  const {
    connected,
    sendMsg,
    onMessage,
    joinRoom,
    onAnnouncement,
  } = useSocket(user?.id, user?.role, token);

  const [announcements, setAnnouncements] = useState([]);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementCategory, setAnnouncementCategory] = useState("GENERAL");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Join admin announcement room
  useEffect(() => {
    if (!connected) return;
    joinRoom("role:ADMIN");

    // Listen for announcements
    const unsubscribe = onAnnouncement((announcement) => {
      setAnnouncements((prev) => [announcement, ...prev]);
    });

    return () => unsubscribe?.();
  }, [connected, joinRoom, onAnnouncement]);

  const handleSendAnnouncement = () => {
    if (!announcementText.trim() || !connected) return;

    setIsSubmitting(true);

    // Send announcement to role:ADMIN room
    sendMsg(
      "role:ADMIN",
      announcementText,
      "ANNOUNCEMENT",
      {
        category: announcementCategory,
        adminId: user?.id,
        adminName: user?.name,
      }
    );

    setAnnouncementText("");
    setAnnouncementCategory("GENERAL");
    setIsSubmitting(false);
  };

  const getCategoryColor = (category) => {
    const colors = {
      GENERAL: "bg-blue-500/10 border-blue-400/40 text-blue-600 dark:text-blue-300",
      SYSTEM: "bg-rose-500/10 border-rose-400/40 text-rose-600 dark:text-rose-300",
      MAINTENANCE: "bg-amber-500/10 border-amber-400/40 text-amber-600 dark:text-amber-300",
      SECURITY: "bg-purple-500/10 border-purple-400/40 text-purple-600 dark:text-purple-300",
      AUDIT: "bg-orange-500/10 border-orange-400/40 text-orange-600 dark:text-orange-300",
    };
    return colors[category] || colors.GENERAL;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      GENERAL: "📢",
      SYSTEM: "⚙️",
      MAINTENANCE: "🔧",
      SECURITY: "🔒",
      AUDIT: "📋",
    };
    return icons[category] || "📢";
  };

  return (
    <div className="space-y-4">
      {/* Announcement Form */}
      {user?.role === "ADMIN" && (
        <div className="tt-card p-5">
          <h3 className="font-semibold mb-3">📢 Broadcast Announcement</h3>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="announcement-category" className="block text-sm font-medium mb-1">
                Category
              </label>
              <select
                id="announcement-category"
                name="announcementCategory"
                value={announcementCategory}
                onChange={(e) => setAnnouncementCategory(e.target.value)}
                className="tt-select"
              >
                <option value="GENERAL">General</option>
                <option value="SYSTEM">System Alert</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SECURITY">Security Notice</option>
                <option value="AUDIT">Audit Notification</option>
              </select>
            </div>

            <div>
              <label htmlFor="announcement-message" className="block text-sm font-medium mb-1">
                Message
              </label>
              <textarea
                id="announcement-message"
                name="announcementMessage"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Enter announcement message..."
                disabled={!connected}
                rows="4"
                className="tt-textarea disabled:bg-[var(--bg-elevated)]"
              />
            </div>

            {!connected && (
              <div className="text-center text-[var(--warning)] text-sm">
                ⚠ Connecting to broadcast system...
              </div>
            )}

            <button
              onClick={handleSendAnnouncement}
              disabled={!connected || !announcementText.trim() || isSubmitting}
              className="tt-btn tt-btn-danger w-full px-4 py-2 disabled:opacity-70"
            >
              {isSubmitting ? "Broadcasting..." : "Broadcast to All Admins"}
            </button>
          </div>
        </div>
      )}

      {/* Announcements Feed */}
      <div className="tt-card p-5">
        <h3 className="font-semibold mb-3">📋 Recent Announcements</h3>

        {announcements.length === 0 ? (
          <div className="text-center text-[var(--muted)] py-8">
            No announcements yet
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-4 rounded-lg border-l-4 ${getCategoryColor(
                  announcement.metadata?.category || "GENERAL"
                )}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getCategoryIcon(announcement.metadata?.category)}
                    </span>
                    <span className="text-sm font-semibold">
                      {announcement.metadata?.category || "General"}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(announcement.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-[var(--muted-strong)] mb-1">{announcement.text}</p>

                <p className="text-xs text-[var(--muted)]">
                  From: {announcement.metadata?.adminName || "Admin"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
