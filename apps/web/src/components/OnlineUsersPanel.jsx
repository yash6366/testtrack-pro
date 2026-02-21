import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks';
import { useAuth } from '@/hooks';

/**
 * OnlineUsersPanel - displays online/offline users in the chat
 * Shows user roles (Admin, Tester, Developer) with badges
 */
export default function OnlineUsersPanel({ roomId, roomPrefix }) {
  const { user } = useAuth();
  const { onUserPresence, getChannelMembers } = useSocket(user?.id, user?.role, localStorage.getItem('token'));

  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Extract channel ID from roomId (format: `${roomPrefix}-${channelId}`)
  const channelId = roomId ? Number(roomId.split('-').pop()) : null;

  // Load channel members on mount
  useEffect(() => {
    if (!channelId) return;

    const loadMembers = async () => {
      try {
        setLoading(true);
        const { members } = await getChannelMembers(channelId);
        setAllMembers(members || []);
      } catch (error) {
        console.error('Failed to load channel members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [channelId, getChannelMembers]);

  // Listen for user presence changes to update the online list.
  useEffect(() => {
    if (!onUserPresence) return;

    const unsubscribe = onUserPresence((data) => {
      if (data.onlineUsers) {
        setOnlineUsers(new Set(data.onlineUsers));
      }
    });

    return unsubscribe;
  }, [onUserPresence]);

  const getRoleColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-red-500/20 text-red-700 dark:text-red-300';
      case 'TESTER':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'DEVELOPER':
        return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const getRoleBadgeText = (role) => {
    return role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'User';
  };

  const isMemberMuted = (member) => {
    if (!member?.isMuted) return false;
    if (!member.mutedUntil) return true;
    return new Date(member.mutedUntil) > new Date();
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--muted)]">👥 Users</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
          Loading...
        </div>
      </div>
    );
  }

  const onlineMembers = allMembers.filter((m) => onlineUsers.has(m.id));
  const offlineMembers = allMembers.filter((m) => !onlineUsers.has(m.id));

  return (
    <div className="flex flex-col h-full bg-[var(--bg-elevated)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
          👥 Users ({onlineMembers.length})
        </h3>
      </div>

      {/* Users list */}
      <div className="flex-1 overflow-y-auto">
        {/* Online users section */}
        {onlineMembers.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider bg-[var(--surface)]">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Online ({onlineMembers.length})
            </div>
            <div className="divide-y divide-[var(--border)]">
              {onlineMembers.map((member) => (
                <div key={member.id} className="px-4 py-3 hover:bg-[var(--surface)] transition-colors">
                  <div className="flex items-start gap-2">
                    {member.picture ? (
                      <img
                        src={member.picture}
                        alt={member.name}
                        className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--muted-strong)] truncate">
                        {member.name}
                        {member.id === user?.id && (
                          <span className="ml-1 text-xs text-[var(--muted)]">(you)</span>
                        )}
                        {isMemberMuted(member) && (
                          <span className="ml-2 text-xs">🔇</span>
                        )}
                      </p>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(member.role)}`}>
                          {getRoleBadgeText(member.role)}
                        </span>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline users section */}
        {offlineMembers.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider bg-[var(--surface)]">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
              Offline ({offlineMembers.length})
            </div>
            <div className="divide-y divide-[var(--border)]">
              {offlineMembers.map((member) => (
                <div key={member.id} className="px-4 py-3 opacity-60 hover:opacity-80 transition-opacity">
                  <div className="flex items-start gap-2">
                    {member.picture ? (
                      <img
                        src={member.picture}
                        alt={member.name}
                        className="w-8 h-8 rounded-full flex-shrink-0 object-cover grayscale"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0 grayscale">
                        <span className="text-xs font-semibold">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--muted)] truncate">
                        {member.name}
                        {isMemberMuted(member) && (
                          <span className="ml-2 text-xs">🔇</span>
                        )}
                      </p>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(member.role)}`}>
                          {getRoleBadgeText(member.role)}
                        </span>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0 mt-1"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {allMembers.length === 0 && (
          <div className="flex items-center justify-center h-32 text-[var(--muted)]">
            <p className="text-sm">No members in this channel</p>
          </div>
        )}
      </div>
    </div>
  );
}
