import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

export default function ChatAdminControls() {
  const [activeSubtab, setActiveSubtab] = useState('messages');
  
  // Message Management state
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const messagesTake = 25;
  const [messageSearch, setMessageSearch] = useState('');

  // User Controls state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const usersTake = 50;

  // Channel Controls state
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState('');
  const [channelsPage, setChannelsPage] = useState(1);
  const [channelsTotal, setChannelsTotal] = useState(0);
  const channelsTake = 50;

  // Audit Log state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const [auditDateTo, setAuditDateTo] = useState('');
  const [auditTargetType, setAuditTargetType] = useState('');
  const [auditTargetQuery, setAuditTargetQuery] = useState('');
  const auditTake = 25;

  // Modal states
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [muteModal, setMuteModal] = useState(null);
  const [muteDuration, setMuteDuration] = useState('30m');
  const [muteCustomUntil, setMuteCustomUntil] = useState('');
  const [muteReason, setMuteReason] = useState('');
  const [lockChannelConfirm, setLockChannelConfirm] = useState(null);
  const [disableChatsMap, setDisableChatsMap] = useState({});

  // Load messages
  useEffect(() => {
    if (activeSubtab !== 'messages') return;

    let isMounted = true;

    const loadMessages = async () => {
      try {
        setMessagesLoading(true);
        setMessagesError('');

        const skip = (messagesPage - 1) * messagesTake;
        const response = await apiClient.get(
          `/api/admin/chat/messages?skip=${skip}&take=${messagesTake}`
        );

        if (isMounted) {
          setMessages(response.messages || []);
          setMessagesTotal(response.pagination?.total || 0);
        }
      } catch (error) {
        if (isMounted) {
          setMessagesError(error.message || 'Failed to load messages');
        }
      } finally {
        if (isMounted) {
          setMessagesLoading(false);
        }
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [activeSubtab, messagesPage]);

  // Load users
  useEffect(() => {
    if (activeSubtab !== 'users') return;

    let isMounted = true;

    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersError('');

        const skip = (usersPage - 1) * usersTake;
        const response = await apiClient.get(
          `/api/admin/chat/users?skip=${skip}&take=${usersTake}`
        );

        if (isMounted) {
          setUsers(response.users || []);
          setUsersTotal(response.pagination?.total || 0);
        }
      } catch (error) {
        if (isMounted) {
          setUsersError(error.message || 'Failed to load users');
        }
      } finally {
        if (isMounted) {
          setUsersLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [activeSubtab, usersPage]);

  // Load channels
  useEffect(() => {
    if (activeSubtab !== 'channels') return;

    let isMounted = true;

    const loadChannels = async () => {
      try {
        setChannelsLoading(true);
        setChannelsError('');

        const skip = (channelsPage - 1) * channelsTake;
        const response = await apiClient.get(
          `/api/admin/chat/channels?skip=${skip}&take=${channelsTake}`
        );

        if (isMounted) {
          setChannels(response.channels || []);
          setChannelsTotal(response.pagination?.total || 0);
        }
      } catch (error) {
        if (isMounted) {
          setChannelsError(error.message || 'Failed to load channels');
        }
      } finally {
        if (isMounted) {
          setChannelsLoading(false);
        }
      }
    };

    loadChannels();

    return () => {
      isMounted = false;
    };
  }, [activeSubtab, channelsPage]);

  // Load audit logs
  useEffect(() => {
    if (activeSubtab !== 'audit') return;

    let isMounted = true;

    const loadAuditLogs = async () => {
      try {
        setAuditLoading(true);
        setAuditError('');

        const skip = (auditPage - 1) * auditTake;
        const params = new URLSearchParams({
          skip,
          take: auditTake,
        });

        if (auditActionFilter) params.append('actionType', auditActionFilter);
        if (auditDateFrom) params.append('dateFrom', auditDateFrom);
        if (auditDateTo) params.append('dateTo', auditDateTo);
        if (auditTargetType) params.append('targetType', auditTargetType);
        if (auditTargetQuery) params.append('targetQuery', auditTargetQuery);

        const response = await apiClient.get(
          `/api/admin/chat/audit-logs?${params.toString()}`
        );

        if (isMounted) {
          setAuditLogs(response.logs || []);
          setAuditTotal(response.pagination?.total || 0);
        }
      } catch (error) {
        if (isMounted) {
          setAuditError(error.message || 'Failed to load audit logs');
        }
      } finally {
        if (isMounted) {
          setAuditLoading(false);
        }
      }
    };

    loadAuditLogs();

    return () => {
      isMounted = false;
    };
  }, [activeSubtab, auditPage, auditActionFilter, auditDateFrom, auditDateTo, auditTargetType, auditTargetQuery]);

  // Delete message handler
  const handleDeleteMessage = async (messageId, reason) => {
    if (!reason?.trim()) return;

    try {
      await apiClient.post(`/api/admin/chat/messages/${messageId}/delete`, {
        reason,
      });

      // Reload messages
      const skip = (messagesPage - 1) * messagesTake;
      const response = await apiClient.get(
        `/api/admin/chat/messages?skip=${skip}&take=${messagesTake}`
      );
      setMessages(response.messages || []);
      setMessagesTotal(response.pagination?.total || 0);
      setDeleteConfirm(null);
      setDeleteReason('');
    } catch (error) {
      alert(error.message || 'Failed to delete message');
    }
  };

  // Mute user handler
  const handleMuteUser = async (userId, mutedUntil, reason) => {
    try {
      await apiClient.post(`/api/admin/chat/users/${userId}/mute`, {
        mutedUntil,
        reason,
      });

      // Reload users
      const skip = (usersPage - 1) * usersTake;
      const response = await apiClient.get(
        `/api/admin/chat/users?skip=${skip}&take=${usersTake}`
      );
      setUsers(response.users || []);
      setUsersTotal(response.pagination?.total || 0);
      setMuteModal(null);
      setMuteDuration('30m');
      setMuteCustomUntil('');
      setMuteReason('');
    } catch (error) {
      alert(error.message || 'Failed to mute user');
    }
  };

  // Unmute user handler
  const handleUnmuteUser = async (userId) => {
    try {
      await apiClient.post(`/api/admin/chat/users/${userId}/unmute`, {});

      // Reload users
      const skip = (usersPage - 1) * usersTake;
      const response = await apiClient.get(
        `/api/admin/chat/users?skip=${skip}&take=${usersTake}`
      );
      setUsers(response.users || []);
      setUsersTotal(response.pagination?.total || 0);
    } catch (error) {
      alert(error.message || 'Failed to unmute user');
    }
  };

  // Lock/Unlock channel handler
  const handleLockChannel = async (channelId, isLocked) => {
    const action = isLocked ? 'unlock' : 'lock';
    const reason = isLocked ? null : prompt('Enter reason for locking channel:');
    
    if (!isLocked && !reason) return;

    try {
      const endpoint = isLocked 
        ? `/api/admin/chat/channels/${channelId}/unlock`
        : `/api/admin/chat/channels/${channelId}/lock`;

      await apiClient.post(endpoint, { reason });

      // Reload channels
      const skip = (channelsPage - 1) * channelsTake;
      const response = await apiClient.get(
        `/api/admin/chat/channels?skip=${skip}&take=${channelsTake}`
      );
      setChannels(response.channels || []);
      setChannelsTotal(response.pagination?.total || 0);
      setLockChannelConfirm(null);
    } catch (error) {
      alert(error.message || `Failed to ${action} channel`);
    }
  };

  // Disable/Enable chat handler
  const handleToggleDisableChat = async (channelId, isDisabled) => {
    const action = isDisabled ? 'enable' : 'disable';
    const reason = isDisabled ? null : prompt('Enter reason for disabling chat:');
    
    if (!isDisabled && !reason) return;

    try {
      const endpoint = isDisabled
        ? `/api/admin/chat/channels/${channelId}/enable`
        : `/api/admin/chat/channels/${channelId}/disable`;

      await apiClient.post(endpoint, { reason });

      // Reload channels
      const skip = (channelsPage - 1) * channelsTake;
      const response = await apiClient.get(
        `/api/admin/chat/channels?skip=${skip}&take=${channelsTake}`
      );
      setChannels(response.channels || []);
      setChannelsTotal(response.pagination?.total || 0);
    } catch (error) {
      alert(error.message || `Failed to ${action} chat`);
    }
  };

  // Export audit logs handler
  const handleExportAuditLogs = async () => {
    try {
      const response = await apiClient.get(
        '/api/admin/chat/audit-logs?take=10000'
      );

      const logs = response.logs || [];
      const csv = [
        ['Timestamp', 'Admin Name', 'Action', 'Target Type', 'Target Name', 'Reason'].join(','),
        ...logs.map(log =>
          [
            log.createdAt,
            log.adminName,
            log.actionType,
            log.targetType,
            log.targetName,
            log.reason || '',
          ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || 'Failed to export audit logs');
    }
  };

  const messagesPagination = Math.ceil(messagesTotal / messagesTake);
  const usersPagination = Math.ceil(usersTotal / usersTake);
  const channelsPagination = Math.ceil(channelsTotal / channelsTake);
  const auditPagination = Math.ceil(auditTotal / auditTake);

  const filteredMessages = messageSearch.trim()
    ? messages.filter((msg) =>
        String(msg?.message || '')
          .toLowerCase()
          .includes(messageSearch.trim().toLowerCase())
      )
    : messages;

  return (
    <div className="space-y-6">
      {/* Subtab Navigation */}
      <div className="tt-card">
        <div className="p-4 border-b border-[var(--border)] flex gap-2 overflow-x-auto">
          {[
            { key: 'messages', label: '📨 Message Management' },
            { key: 'users', label: '👥 User Controls' },
            { key: 'channels', label: '#️⃣ Channel Controls' },
            { key: 'audit', label: '📋 Audit Log' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSubtab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded transition whitespace-nowrap ${
                activeSubtab === tab.key
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Management Tab */}
      {activeSubtab === 'messages' && (
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h4 className="text-lg font-semibold">Message Management</h4>
            <p className="text-sm text-[var(--muted)] mt-1">Delete inappropriate or spam messages</p>
            {/* Client-side search for quick message filtering */}
            <div className="mt-3">
              <input
                type="text"
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                placeholder="Search message text"
                className="tt-input w-full"
              />
            </div>
          </div>

          {messagesError && (
            <div className="mx-6 mt-4 p-4 bg-red-500/10 text-red-600 rounded">
              {messagesError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-3 text-left font-semibold">Timestamp</th>
                  <th className="px-6 py-3 text-left font-semibold">Channel</th>
                  <th className="px-6 py-3 text-left font-semibold">Sender</th>
                  <th className="px-6 py-3 text-left font-semibold">Preview</th>
                  <th className="px-6 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {messagesLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-[var(--muted)]">
                      Loading messages...
                    </td>
                  </tr>
                ) : filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-[var(--muted)]">
                      No messages found
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map(msg => (
                    <tr key={msg.id} className="border-b border-[var(--border)] hover:bg-[var(--background)]/50">
                      <td className="px-6 py-3 text-xs text-[var(--muted)]">
                        {new Date(msg.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-medium">{msg.channel?.name || 'Unknown'}</td>
                      <td className="px-6 py-3">{msg.sender?.name || 'Unknown'}</td>
                      <td className="px-6 py-3 max-w-xs truncate text-[var(--muted)]">
                        {msg.message?.substring(0, 50)}...
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => {
                            setDeleteConfirm(msg.id);
                            setDeleteReason('');
                          }}
                          className="tt-btn tt-btn-sm tt-btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {messagesPagination > 1 && (
            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
              <span className="text-sm text-[var(--muted)]">
                Showing {(messagesPage - 1) * messagesTake + 1} to {Math.min(messagesPage * messagesTake, messagesTotal)} of {messagesTotal}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={messagesPage === 1}
                  onClick={() => setMessagesPage(p => p - 1)}
                  className="tt-btn tt-btn-sm tt-btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={messagesPage >= messagesPagination}
                  onClick={() => setMessagesPage(p => p + 1)}
                  className="tt-btn tt-btn-sm tt-btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Controls Tab */}
      {activeSubtab === 'users' && (
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h4 className="text-lg font-semibold">User Controls</h4>
            <p className="text-sm text-[var(--muted)] mt-1">Mute users temporarily to restrict messaging</p>
          </div>

          {usersError && (
            <div className="mx-6 mt-4 p-4 bg-red-500/10 text-red-600 rounded">
              {usersError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Role</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Mute Status</th>
                  <th className="px-6 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-[var(--muted)]">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-[var(--muted)]">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--background)]/50">
                      <td className="px-6 py-3 font-medium">{user.name}</td>
                      <td className="px-6 py-3 text-[var(--muted)]">{user.email}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-600 dark:text-blue-300">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </td>
                      <td className="px-6 py-3">
                        {user.isMuted ? (
                          <span className="text-xs flex items-center gap-1">
                            🔇 Until {new Date(user.mutedUntil).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">Not muted</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {user.isMuted ? (
                          <button
                            onClick={() => handleUnmuteUser(user.id)}
                            className="tt-btn tt-btn-sm tt-btn-outline"
                          >
                            Unmute
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setMuteModal(user.id);
                              setMuteDuration('30m');
                              setMuteCustomUntil('');
                              setMuteReason('');
                            }}
                            className="tt-btn tt-btn-sm tt-btn-warning"
                          >
                            Mute
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usersPagination > 1 && (
            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
              <span className="text-sm text-[var(--muted)]">
                Showing {(usersPage - 1) * usersTake + 1} to {Math.min(usersPage * usersTake, usersTotal)} of {usersTotal}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={usersPage === 1}
                  onClick={() => setUsersPage(p => p - 1)}
                  className="tt-btn tt-btn-sm tt-btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={usersPage >= usersPagination}
                  onClick={() => setUsersPage(p => p + 1)}
                  className="tt-btn tt-btn-sm tt-btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Channel Controls Tab */}
      {activeSubtab === 'channels' && (
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h4 className="text-lg font-semibold">Channel Controls</h4>
            <p className="text-sm text-[var(--muted)] mt-1">Lock channels to read-only or disable chat entirely</p>
          </div>

          {channelsError && (
            <div className="mx-6 mt-4 p-4 bg-red-500/10 text-red-600 rounded">
              {channelsError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-3 text-left font-semibold">Channel</th>
                  <th className="px-6 py-3 text-left font-semibold">Type</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Lock</th>
                  <th className="px-6 py-3 text-left font-semibold">Chat</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {channelsLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-[var(--muted)]">
                      Loading channels...
                    </td>
                  </tr>
                ) : channels.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-[var(--muted)]">
                      No channels found
                    </td>
                  </tr>
                ) : (
                  channels.map(channel => (
                    <tr key={channel.id} className="border-b border-[var(--border)] hover:bg-[var(--background)]/50">
                      <td className="px-6 py-3 font-medium">{channel.name}</td>
                      <td className="px-6 py-3 text-xs">
                        <span className="px-2 py-1 bg-slate-500/10 text-slate-600 dark:text-slate-300 rounded">
                          {channel.channelType || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {channel.archived ? 'Archived' : 'Active'}
                      </td>
                      <td className="px-6 py-3">
                        {channel.isLocked ? '🔒 Yes' : '🔓 No'}
                      </td>
                      <td className="px-6 py-3">
                        {channel.channelType === 'project'
                          ? (channel.isDisabled ? '⛔ Disabled' : '✅ Enabled')
                          : '—'}
                      </td>
                      <td className="px-6 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleLockChannel(channel.id, channel.isLocked)}
                          className={`tt-btn tt-btn-sm ${
                            channel.isLocked ? 'tt-btn-outline' : 'tt-btn-warning'
                          }`}
                        >
                          {channel.isLocked ? 'Unlock' : 'Lock'}
                        </button>
                        {channel.channelType === 'project' && (
                          <button
                            onClick={() => handleToggleDisableChat(channel.id, channel.isDisabled)}
                            className={`tt-btn tt-btn-sm ${
                              channel.isDisabled ? 'tt-btn-outline' : 'tt-btn-danger'
                            }`}
                          >
                            {channel.isDisabled ? 'Enable' : 'Disable'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {channelsPagination > 1 && (
            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
              <span className="text-sm text-[var(--muted)]">
                Showing {(channelsPage - 1) * channelsTake + 1} to {Math.min(channelsPage * channelsTake, channelsTotal)} of {channelsTotal}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={channelsPage === 1}
                  onClick={() => setChannelsPage(p => p - 1)}
                  className="tt-btn tt-btn-sm tt-btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={channelsPage >= channelsPagination}
                  onClick={() => setChannelsPage(p => p + 1)}
                  className="tt-btn tt-btn-sm tt-btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {activeSubtab === 'audit' && (
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-start">
            <div>
              <h4 className="text-lg font-semibold">Chat Admin Audit Log</h4>
              <p className="text-sm text-[var(--muted)] mt-1">Track all administrative actions</p>
            </div>
            <button
              onClick={handleExportAuditLogs}
              className="tt-btn tt-btn-sm tt-btn-outline"
            >
              📥 Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-[var(--border)] grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Action Type</label>
              <select
                value={auditActionFilter}
                onChange={e => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="tt-input w-full"
              >
                <option value="">All Actions</option>
                <option value="MESSAGE_DELETED">Message Deleted</option>
                <option value="USER_MUTED">User Muted</option>
                <option value="USER_UNMUTED">User Unmuted</option>
                <option value="CHANNEL_LOCKED">Channel Locked</option>
                <option value="CHANNEL_UNLOCKED">Channel Unlocked</option>
                <option value="CHAT_DISABLED">Chat Disabled</option>
                <option value="CHAT_ENABLED">Chat Enabled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <input
                type="date"
                value={auditDateFrom}
                onChange={e => {
                  setAuditDateFrom(e.target.value);
                  setAuditPage(1);
                }}
                className="tt-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <input
                type="date"
                value={auditDateTo}
                onChange={e => {
                  setAuditDateTo(e.target.value);
                  setAuditPage(1);
                }}
                className="tt-input w-full"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-b border-[var(--border)] grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Target Type</label>
              <select
                value={auditTargetType}
                onChange={e => {
                  setAuditTargetType(e.target.value);
                  setAuditPage(1);
                }}
                className="tt-input w-full"
              >
                <option value="">All Targets</option>
                <option value="USER">User</option>
                <option value="CHANNEL">Channel</option>
                <option value="MESSAGE">Message</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Target User/Channel</label>
              <input
                type="text"
                value={auditTargetQuery}
                onChange={e => {
                  setAuditTargetQuery(e.target.value);
                  setAuditPage(1);
                }}
                placeholder="Name or ID"
                className="tt-input w-full"
              />
            </div>
          </div>

          {auditError && (
            <div className="mx-6 mt-4 p-4 bg-red-500/10 text-red-600 rounded">
              {auditError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-3 text-left font-semibold">Timestamp</th>
                  <th className="px-6 py-3 text-left font-semibold">Admin</th>
                  <th className="px-6 py-3 text-left font-semibold">Action</th>
                  <th className="px-6 py-3 text-left font-semibold">Target</th>
                  <th className="px-6 py-3 text-left font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-[var(--muted)]">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-[var(--muted)]">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-[var(--border)] hover:bg-[var(--background)]/50">
                      <td className="px-6 py-3 text-xs text-[var(--muted)]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-medium">{log.adminName}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-600 dark:text-blue-300 whitespace-nowrap">
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[var(--muted)]">
                          {log.targetType}: {log.targetName || `#${log.targetId}`}
                        </span>
                      </td>
                      <td className="px-6 py-3 max-w-xs truncate text-[var(--muted)]">
                        {log.reason || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {auditPagination > 1 && (
            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
              <span className="text-sm text-[var(--muted)]">
                Showing {(auditPage - 1) * auditTake + 1} to {Math.min(auditPage * auditTake, auditTotal)} of {auditTotal}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={auditPage === 1}
                  onClick={() => setAuditPage(p => p - 1)}
                  className="tt-btn tt-btn-sm tt-btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={auditPage >= auditPagination}
                  onClick={() => setAuditPage(p => p + 1)}
                  className="tt-btn tt-btn-sm tt-btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] rounded-lg p-6 max-w-sm mx-4 space-y-4">
            <h3 className="text-lg font-semibold">Delete Message?</h3>
            <p className="text-[var(--muted)]">
              This action will permanently delete the message and cannot be undone.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="tt-input w-full"
                rows="3"
                placeholder="Why is this message being deleted?"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="tt-btn tt-btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMessage(deleteConfirm, deleteReason)}
                disabled={!deleteReason.trim()}
                className="tt-btn tt-btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mute User Modal */}
      {muteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--card)] rounded-lg p-6 max-w-sm mx-4 space-y-4">
            <h3 className="text-lg font-semibold">Mute User</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Duration</label>
                <select
                  value={muteDuration}
                  onChange={(e) => setMuteDuration(e.target.value)}
                  className="tt-input w-full"
                >
                  <option value="15m">15 minutes</option>
                  <option value="30m">30 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="24h">24 hours</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {muteDuration === 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Mute Until</label>
                  <input
                    type="datetime-local"
                    value={muteCustomUntil}
                    onChange={(e) => setMuteCustomUntil(e.target.value)}
                    className="tt-input w-full"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  value={muteReason}
                  onChange={(e) => setMuteReason(e.target.value)}
                  className="tt-input w-full"
                  placeholder="Why is this user being muted?"
                  rows="3"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setMuteModal(null)}
                className="tt-btn tt-btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  let until = '';
                  const now = new Date();

                  if (muteDuration === 'custom') {
                    until = muteCustomUntil;
                  } else if (muteDuration === '15m') {
                    until = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
                  } else if (muteDuration === '30m') {
                    until = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
                  } else if (muteDuration === '1h') {
                    until = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
                  } else if (muteDuration === '24h') {
                    until = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
                  }

                  if (!until) {
                    alert('Please select a date and time');
                    return;
                  }
                  handleMuteUser(muteModal, until, muteReason);
                }}
                className="tt-btn tt-btn-warning flex-1"
              >
                Mute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
