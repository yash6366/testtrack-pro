import React from 'react';

/**
 * ActualResultInput Component
 * Input field for capturing actual test results with comparison to expected
 */
export default function ActualResultInput({
  expectedResult,
  actualResult,
  onChange,
  maxLength = 2000,
  placeholder = 'Describe what actually happened...',
  disabled = false,
  rows = 4,
}) {
  const characterCount = actualResult?.length || 0;
  const isNearLimit = characterCount > maxLength * 0.9;
  const isAtLimit = characterCount >= maxLength;

  return (
    <div className="space-y-3">
      {/* Expected Result Display */}
      {expectedResult && (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Expected Result
          </label>
          <div className="relative">
            <div className="bg-[var(--bg-elevated)] p-4 rounded-lg border border-[var(--border)] text-sm leading-relaxed">
              {expectedResult || 'No expected result defined'}
            </div>
            <div className="absolute -right-2 -top-2 h-3 w-3 bg-emerald-500 rounded-full" />
          </div>
        </div>
      )}

      {/* Actual Result Input */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Actual Result
          {!disabled && <span className="text-rose-500 ml-1">*</span>}
        </label>

        <div className="relative">
          <textarea
            value={actualResult || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            rows={rows}
            className={`w-full p-3 border rounded-lg bg-[var(--bg)] text-sm font-normal leading-relaxed 
              focus:outline-none focus:ring-2 focus:ring-offset-0 
              placeholder-[var(--muted)] resize-none transition-all
              ${
                isAtLimit
                  ? 'border-rose-500 focus:ring-rose-500'
                  : isNearLimit
                  ? 'border-amber-500 focus:ring-amber-500'
                  : 'border-[var(--border)] focus:ring-blue-500'
              }
              ${disabled ? 'bg-[var(--bg-elevated)] cursor-not-allowed opacity-50' : ''}
            `}
          />

          {/* Character counter */}
          <div
            className={`absolute bottom-3 right-3 text-xs font-medium 
              ${
                isAtLimit
                  ? 'text-rose-500'
                  : isNearLimit
                  ? 'text-amber-500'
                  : 'text-[var(--muted)]'
              }
            `}
          >
            {characterCount}/{maxLength}
          </div>
        </div>

        {isAtLimit && (
          <p className="text-xs text-rose-500 mt-1">
            Maximum character limit reached
          </p>
        )}

        {isNearLimit && !isAtLimit && (
          <p className="text-xs text-amber-500 mt-1">
            Approaching character limit
          </p>
        )}
      </div>

      {/* Comparison Hint */}
      {expectedResult && actualResult && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-xs text-blue-700 dark:text-blue-200">
            <strong>Tip:</strong> Compare your actual result with the expected result above
            to determine if the test passed.
          </p>
        </div>
      )}
    </div>
  );
}
