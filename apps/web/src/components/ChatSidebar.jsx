import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks';
import { useChat } from '@/context/ChatContext';
import DirectMessagesPanel from './DirectMessagesPanel';

/**
 * ChatSidebar - Unified chat sidebar with 4 sections
 * 1. Channels - General public channels
 * 2. Role Channels - Auto-created channels for roles (#testers, #developers, #admins)
 * 3. Projects - Project-based channels created by admins
 * 4. Direct Messages - 1-to-1 private conversations
 */
export default function ChatSidebar({
  selectedRoom,
  onSelectChannel,
  onSelectDirectMessage,
  onCreateChannel,
  showDirectMessages = true,
}) {
  const { user } = useAuth();
  const { channels, loading, archivedProjects, loadArchivedChannels, toggleChannelArchive, channelUnreadCounts } = useChat();
  const [expandedSections, setExpandedSections] = useState({
    channels: true,
    roleChannels: true,
    projects: true,
    directMessages: true,
  });
  const [showNewChannelForm, setShowNewChannelForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [allowedUserIdsInput, setAllowedUserIdsInput] = useState('');
  const [selectedRoles, setSelectedRoles] = useState({
    ADMIN: true,
    DEVELOPER: true,
    TESTER: true,
  });
  // Toggle archived project channels for admins.
  const [showArchived, setShowArchived] = useState(false);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || user?.role !== 'ADMIN') return;

    try {
      const allowedRoles = Object.keys(selectedRoles).filter((role) => selectedRoles[role]);
      const allowedUserIds = allowedUserIdsInput
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value));
      await onCreateChannel?.(newChannelName.trim(), allowedRoles, projectName.trim(), allowedUserIds);
      setNewChannelName('');
      setProjectName('');
      setAllowedUserIdsInput('');
      setSelectedRoles({
        ADMIN: true,
        DEVELOPER: true,
        TESTER: true,
      });
      setShowNewChannelForm(false);
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const toggleArchived = async () => {
    const next = !showArchived;
    setShowArchived(next);
    if (next && user?.role === 'ADMIN') {
      await loadArchivedChannels();
    }
  };

  const isChannelSelected = (channelId) => {
    return selectedRoom === `channel-${channelId}`;
  };

  const getRoleColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'text-red-600 dark:text-red-400';
      case 'TESTER':
        return 'text-blue-600 dark:text-blue-400';
      case 'DEVELOPER':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getRoleBadgeText = (role) => {
    return role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'User';
  };

  if (loading && !channels?.general?.length) {
    return (
      <div className="w-full bg-[var(--bg-elevated)] border-r border-[var(--border)] flex flex-col h-full">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">Chat</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
          Loading channels...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--bg-elevated)] border-r border-[var(--border)] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex-shrink-0">
        <h2 className="text-lg font-semibold text-[var(--muted-strong)]">💬 Chat</h2>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {/* CHANNELS SECTION */}
        {channels?.general && channels.general.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('channels')}
              className="w-full px-3 py-2 flex items-center justify-between text-sm font-semibold text-[var(--muted-strong)] hover:bg-[var(--surface)] rounded transition-colors"
            >
              <span>📂 Channels</span>
              <span className="text-xs">{expandedSections.channels ? '▼' : '▶'}</span>
            </button>
            {expandedSections.channels && (
              <div className="space-y-1 ml-2">
                {channels.general.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel?.(channel.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors truncate ${
                      isChannelSelected(channel.id)
                        ? 'bg-[var(--primary)]/20 text-[var(--primary-strong)] font-semibold'
                        : 'text-[var(--muted)] hover:bg-[var(--surface)]'
                    }`}
                    title={channel.name}
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate"># {channel.name}</span>
                      {channel.isDisabled ? (
                        <span className="text-xs">⛔</span>
                      ) : channel.isLocked ? (
                        <span className="text-xs">🔒</span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ROLE-BASED CHANNELS SECTION */}
        {channels?.roleChannels && channels.roleChannels.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('roleChannels')}
              className="w-full px-3 py-2 flex items-center justify-between text-sm font-semibold text-[var(--muted-strong)] hover:bg-[var(--surface)] rounded transition-colors"
            >
              <span>🔒 Role Channels</span>
              <span className="text-xs">{expandedSections.roleChannels ? '▼' : '▶'}</span>
            </button>
            {expandedSections.roleChannels && (
              <div className="space-y-1 ml-2">
                {channels.roleChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel?.(channel.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors truncate flex items-center gap-2 ${
                      isChannelSelected(channel.id)
                        ? 'bg-[var(--primary)]/20 text-[var(--primary-strong)] font-semibold'
                        : 'text-[var(--muted)] hover:bg-[var(--surface)]'
                    }`}
                    title={channel.name}
                  >
                    <span>🔒</span>
                    <span className="truncate"># {channel.name}</span>
                    {channel.isDisabled ? (
                      <span className="text-xs">⛔</span>
                    ) : channel.isLocked ? (
                      <span className="text-xs">🔒</span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROJECTS SECTION */}
        {channels?.projects && channels.projects.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-3 py-2">
              <button
                onClick={() => toggleSection('projects')}
                className="flex items-center justify-between text-sm font-semibold text-[var(--muted-strong)] hover:bg-[var(--surface)] rounded transition-colors flex-1 px-0"
              >
                <span>📊 Projects</span>
                <span className="text-xs">{expandedSections.projects ? '▼' : '▶'}</span>
              </button>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setShowNewChannelForm(!showNewChannelForm)}
                  className="text-[var(--primary)] hover:text-[var(--primary-strong)] text-lg leading-none"
                  title="Create new project channel"
                >
                  +
                </button>
              )}
            </div>

            {/* Create channel form */}
            {showNewChannelForm && user?.role === 'ADMIN' && (
              <div className="ml-2 p-2 bg-[var(--surface)] rounded space-y-2 mb-2">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Channel name (without #)"
                  className="tt-input text-sm w-full"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateChannel()}
                />
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name (optional)"
                  className="tt-input text-sm w-full"
                />
                {/* Optional user-level access list */}
                <input
                  type="text"
                  value={allowedUserIdsInput}
                  onChange={(e) => setAllowedUserIdsInput(e.target.value)}
                  placeholder="User IDs (comma-separated, optional)"
                  className="tt-input text-sm w-full"
                />
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[var(--muted)]">Allowed roles</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(selectedRoles).map((role) => (
                      <label key={role} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={selectedRoles[role]}
                          onChange={(e) =>
                            setSelectedRoles((prev) => ({
                              ...prev,
                              [role]: e.target.checked,
                            }))
                          }
                        />
                        <span>{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateChannel}
                    disabled={!newChannelName.trim()}
                    className="tt-btn bg-[var(--primary)] text-white text-xs px-2 py-1 rounded disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewChannelForm(false)}
                    className="tt-btn bg-[var(--bg-elevated)] text-xs px-2 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {expandedSections.projects && (
              <div className="space-y-1 ml-2">
                {channels.projects
                  .filter((channel) => !channel.archived)
                  .map((channel) => (
                    <div key={channel.id} className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectChannel?.(channel.id)}
                        className={`flex-1 text-left px-3 py-2 rounded text-sm transition-colors truncate ${
                          isChannelSelected(channel.id)
                            ? 'bg-[var(--primary)]/20 text-[var(--primary-strong)] font-semibold'
                            : 'text-[var(--muted)] hover:bg-[var(--surface)]'
                        }`}
                        title={channel.name}
                      >
                        <span className="flex items-center gap-2">
                          <span className="truncate"># {channel.name}</span>
                          {channelUnreadCounts?.[channel.id] > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary)] text-white">
                              {channelUnreadCounts[channel.id]}
                            </span>
                          )}
                          {channel.isDisabled ? (
                            <span className="text-xs">⛔</span>
                          ) : channel.isLocked ? (
                            <span className="text-xs">🔒</span>
                          ) : null}
                        </span>
                      </button>
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={() => toggleChannelArchive(channel.id, true)}
                          className="text-xs text-[var(--muted)] hover:text-[var(--primary)]"
                          title="Archive channel"
                        >
                          🗄️
                        </button>
                      )}
                    </div>
                  ))}
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={toggleArchived}
                    className="w-full text-left px-3 py-2 rounded text-xs text-[var(--muted)] hover:bg-[var(--surface)]"
                  >
                    {showArchived ? 'Hide archived' : 'View archived'}
                  </button>
                )}
                {showArchived && archivedProjects.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {archivedProjects.map((channel) => (
                      <div
                        key={channel.id}
                        className="w-full text-left px-3 py-2 rounded text-xs text-[var(--muted)] bg-[var(--surface)]/50 flex items-center justify-between"
                        title={channel.name}
                      >
                        <span className="truncate"># {channel.name} (archived)</span>
                        <button
                          onClick={() => toggleChannelArchive(channel.id, false)}
                          className="text-[var(--primary)] text-xs"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DIRECT MESSAGES SECTION */}
        {showDirectMessages && (
          <div className="border-t border-[var(--border)] pt-2">
            <button
              onClick={() => toggleSection('directMessages')}
              className="w-full px-3 py-2 flex items-center justify-between text-sm font-semibold text-[var(--muted-strong)] hover:bg-[var(--surface)] rounded transition-colors"
            >
              <span>💬 Direct Messages</span>
              <span className="text-xs">{expandedSections.directMessages ? '▼' : '▶'}</span>
            </button>
            {expandedSections.directMessages && (
              <div className="ml-2">
                <DirectMessagesPanel onSelectConversation={onSelectDirectMessage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
