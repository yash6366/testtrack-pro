/**
 * ChannelStatusOverlay - Shows when channel is locked or disabled
 */
export default function ChannelStatusOverlay({ isLocked, isDisabled, isAdmin, channelName }) {
  if (!isLocked && !isDisabled) return null;

  if (isAdmin) {
    return null;
  }

  if (isDisabled) {
    return (
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded z-40">
        <div className="bg-[var(--card)] rounded-lg p-8 text-center max-w-sm">
          <p className="text-4xl mb-4">⛔</p>
          <h3 className="text-xl font-semibold mb-2">Chat Disabled</h3>
          <p className="text-[var(--muted)] mb-4">
            Chat for {channelName || 'this channel'} has been disabled by an Admin.
          </p>
          {isAdmin && (
            <p className="text-xs text-blue-500 bg-blue-500/10 rounded p-2">
              Only admins can see this message. Enable chat from Admin Dashboard.
            </p>
          )}
          {!isAdmin && (
            <p className="text-sm text-[var(--muted)]">
              Please contact an administrator if you believe this is an error.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded z-40">
        <div className="bg-[var(--card)] rounded-lg p-8 text-center max-w-sm">
          <p className="text-4xl mb-4">🔒</p>
          <h3 className="text-xl font-semibold mb-2">Channel Locked</h3>
          <p className="text-[var(--muted)] mb-4">
            This channel is currently locked for reading only.
          </p>
          {isAdmin && (
            <p className="text-xs text-blue-500 bg-blue-500/10 rounded p-2">
              Admins can read. Unlock from Admin Dashboard to allow messages.
            </p>
          )}
          {!isAdmin && (
            <p className="text-sm text-[var(--muted)]">
              You can read messages but cannot send new ones.
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
