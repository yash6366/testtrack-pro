import React from 'react';

const STATUS_CONFIG = {
  PASSED: { icon: '✓', color: 'emerald', label: 'Passed' },
  FAILED: { icon: '✗', color: 'rose', label: 'Failed' },
  BLOCKED: { icon: '⊗', color: 'amber', label: 'Blocked' },
  SKIPPED: { icon: '-', color: 'slate', label: 'Skipped' },
  INCONCLUSIVE: { icon: '?', color: 'blue', label: 'Inconclusive' },
};

/**
 * StepNavigator Component
 * Displays list of test steps with status indicators
 */
export default function StepNavigator({
  steps,
  currentStepIndex,
  onStepSelect,
  disabled = false,
}) {
  if (!steps || steps.length === 0) {
    return (
      <div className="tt-card">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold">Steps</h3>
        </div>
        <div className="px-6 py-8 text-center text-[var(--muted)]">
          No steps available
        </div>
      </div>
    );
  }

  return (
    <div className="tt-card h-fit max-h-[calc(100vh-300px)] overflow-y-auto">
      <div className="px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg)]">
        <h3 className="font-semibold">Steps ({steps.length})</h3>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {steps.map((step, idx) => {
          const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.SKIPPED;
          const colorClass = `${statusConfig.color}-500`;
          const bgColorClass = `bg-${statusConfig.color}-500/10`;
          const textColorClass = `text-${statusConfig.color}-600 dark:text-${statusConfig.color}-300`;

          return (
            <button
              key={step.id}
              onClick={() => !disabled && onStepSelect(idx)}
              disabled={disabled}
              className={`w-full text-left px-6 py-4 transition ${
                idx === currentStepIndex
                  ? `${bgColorClass} border-l-4 border-${colorClass}`
                  : 'hover:bg-[var(--bg-elevated)]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                {/* Status indicator */}
                <span className={`text-lg font-bold ${textColorClass}`}>
                  {statusConfig.icon}
                </span>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">
                    Step {idx + 1}
                  </div>
                  <div className="text-xs text-[var(--muted)] truncate mt-1">
                    {step.testStep?.action || 'No action defined'}
                  </div>
                </div>

                {/* Status label */}
                <div className="text-xs">
                  <span
                    className={`px-2 py-1 rounded-full font-semibold ${
                      step.status === 'PASSED'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200'
                        : step.status === 'FAILED'
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-200'
                        : step.status === 'BLOCKED'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200'
                        : step.status === 'SKIPPED'
                        ? 'bg-slate-500/20 text-slate-700 dark:text-slate-200'
                        : 'bg-blue-500/20 text-blue-700 dark:text-blue-200'
                    }`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
