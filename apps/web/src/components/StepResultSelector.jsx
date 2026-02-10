import React from 'react';

const RESULT_OPTIONS = [
  {
    value: 'PASSED',
    label: 'Pass',
    description: 'Test executed as expected',
    icon: '✓',
    color: 'emerald',
  },
  {
    value: 'FAILED',
    label: 'Fail',
    description: 'Test did not meet expectations',
    icon: '✗',
    color: 'rose',
  },
  {
    value: 'BLOCKED',
    label: 'Blocked',
    description: 'Unable to complete test',
    icon: '⊗',
    color: 'amber',
  },
  {
    value: 'SKIPPED',
    label: 'Skip',
    description: 'Test was intentionally skipped',
    icon: '-',
    color: 'slate',
  },
];

/**
 * StepResultSelector Component
 * Radio button group for selecting step result status
 */
export default function StepResultSelector({
  value,
  onChange,
  disabled = false,
  compact = false,
}) {
  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap">
        {RESULT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
              value === option.value
                ? option.value === 'PASSED'
                  ? 'bg-emerald-500 text-white'
                  : option.value === 'FAILED'
                  ? 'bg-rose-500 text-white'
                  : option.value === 'BLOCKED'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-500 text-white'
                : `bg-[var(--bg-elevated)] text-[var(--foreground)] border border-[var(--border)] 
                  hover:border-[var(--foreground)]`
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
        Mark Step Result
      </label>

      <div className="space-y-2">
        {RESULT_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex items-start p-3 border rounded-lg cursor-pointer transition 
              ${
                value === option.value
                  ? option.color === 'emerald'
                    ? 'bg-emerald-500/10 border-emerald-500/50'
                    : option.color === 'rose'
                    ? 'bg-rose-500/10 border-rose-500/50'
                    : option.color === 'amber'
                    ? 'bg-amber-500/10 border-amber-500/50'
                    : 'bg-slate-500/10 border-slate-500/50'
                  : 'bg-[var(--bg-elevated)] border-[var(--border)] hover:border-[var(--foreground)]'
              } 
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="radio"
              name="step-result"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => !disabled && onChange(e.target.value)}
              disabled={disabled}
              className="mt-1 h-4 w-4 cursor-pointer accent-current"
            />

            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-lg font-bold 
                    ${
                      option.color === 'emerald'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : option.color === 'rose'
                        ? 'text-rose-600 dark:text-rose-400'
                        : option.color === 'amber'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }
                  `}
                >
                  {option.icon}
                </span>
                <span className="font-semibold text-[var(--foreground)]">
                  {option.label}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">
                {option.description}
              </p>
            </div>
          </label>
        ))}
      </div>

      {/* Help text for selected option */}
      {value && (
        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-200">
            {value === 'PASSED' && 'The test executed correctly and met all expectations.'}
            {value === 'FAILED' &&
              'The test did not produce the expected result. Consider creating a defect.'}
            {value === 'BLOCKED' &&
              'The test could not be completed due to external factors.'}
            {value === 'SKIPPED' &&
              'The test was not executed for this run.'}
          </p>
        </div>
      )}
    </div>
  );
}
