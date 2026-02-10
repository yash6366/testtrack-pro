import React, { useEffect, useState } from 'react';

/**
 * ExecutionTimer Component
 * Display and control test execution timer
 */
export default function ExecutionTimer({
  seconds,
  isRunning,
  isPaused,
  onPause,
  onResume,
  lastSaved,
  onAutoSave,
}) {
  const [autoSaveCountdown, setAutoSaveCountdown] = useState(30);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  // Format time for display
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate time since last save
  const getTimeSinceLastSave = () => {
    if (!lastSaved) return null;

    const elapsed = Math.floor((Date.now() - new Date(lastSaved).getTime()) / 1000);

    if (elapsed < 60) return `${elapsed}s ago`;
    if (elapsed < 3600) {
      const minutes = Math.floor(elapsed / 60);
      return `${minutes}m ago`;
    }

    const hours = Math.floor(elapsed / 3600);
    return `${hours}h ago`;
  };

  // Auto-save timer
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      setAutoSaveCountdown((prev) => {
        if (prev <= 1) {
          // Time to save
          if (onAutoSave) {
            onAutoSave();
            setShowSaveIndicator(true);
            setTimeout(() => setShowSaveIndicator(false), 2000);
          }
          return 30; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, onAutoSave]);

  return (
    <div className="tt-card">
      <div className="p-6 space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-5xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider">
            {formatTime(seconds)}
          </div>
          <p className="text-sm text-[var(--muted)] mt-2">
            Elapsed Time
          </p>
        </div>

        {/* Timer Status */}
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${
                isPaused
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="text-xs font-medium text-[var(--foreground)]">
              {isPaused ? '⏸ Paused' : isRunning ? '▶ Running' : '⏹ Stopped'}
            </span>
          </div>

          {isRunning && (
            <div className="text-xs text-[var(--muted)]">
              Auto-save in {autoSaveCountdown}s
            </div>
          )}
        </div>

        {/* Timer Controls */}
        <div className="flex gap-2">
          {isRunning && !isPaused && (
            <button
              onClick={onPause}
              className="flex-1 tt-btn tt-btn-outline text-sm py-2 flex items-center justify-center gap-2"
            >
              ⏸ Pause
            </button>
          )}

          {isRunning && isPaused && (
            <button
              onClick={onResume}
              className="flex-1 tt-btn tt-btn-primary text-sm py-2 flex items-center justify-center gap-2"
            >
              ▶ Resume
            </button>
          )}
        </div>

        {/* Auto-save Indicator */}
        {showSaveIndicator && (
          <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <span className="text-emerald-600 dark:text-emerald-400">✓</span>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Progress auto-saved
            </span>
          </div>
        )}

        {/* Last Save Info */}
        {lastSaved && (
          <div className="text-center">
            <p className="text-xs text-[var(--muted)]">
              Last saved: <span className="font-semibold">{getTimeSinceLastSave()}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
