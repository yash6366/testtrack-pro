export default function LoadingState({ message = 'Loading...', className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="tt-card px-6 py-5 text-sm text-[var(--muted)]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          {message}
        </div>
      </div>
    </div>
  );
}
