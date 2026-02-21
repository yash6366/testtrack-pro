import ThemeToggle from '@/components/ThemeToggle';
import ChatLayout from '@/components/ChatLayout';
import { ChatProvider } from '@/context/ChatContext';
import { useAuth } from "../hooks";
import { useSocket } from "../hooks/useSocket";
import BackButton from '@/components/ui/BackButton';

export default function Chat() {
  const { user, token } = useAuth();
  const { connected } = useSocket(user?.id, user?.role, token);

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-50 backdrop-blur">
        <div className="w-full px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <BackButton label="Back to Dashboard" fallback="/dashboard" />
            <div className="h-10 w-10 rounded-2xl bg-[var(--surface-strong)] border border-[var(--border)] flex items-center justify-center font-bold">
              TT
            </div>
            <div>
              <h1 className="text-lg font-semibold">Team Communication</h1>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="tt-pill">Chat hub</span>
                {connected && <span className="text-[var(--success)]">Connected</span>}
                {!connected && <span className="text-[var(--warning)]">Connecting...</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted)]">{user?.email}</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <ChatProvider>
        <ChatLayout className="flex-1 min-h-0" />
      </ChatProvider>
    </div>
  );
}
