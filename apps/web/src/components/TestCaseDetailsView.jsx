import { useState } from 'react';

export default function TestCaseDetailsView({ sourceTestCase, sourceExecution }) {
  const [expandedStep, setExpandedStep] = useState(null);

  if (!sourceTestCase && !sourceExecution) {
    return (
      <div className="bg-[var(--bg-elevated)] p-4 rounded-lg text-center text-[var(--muted)]">
        No related test case available
      </div>
    );
  }

  const testCase = sourceTestCase || sourceExecution?.testCase;

  return (
    <div className="space-y-6">
      {/* Test Case Header */}
      {testCase && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[var(--muted)] block mb-2">
              Test Case Name
            </h4>
            <p className="text-lg font-semibold">{testCase.name}</p>
          </div>

          {testCase.description && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--muted)] block mb-2">
                Description
              </h4>
              <p className="text-sm bg-[var(--bg-elevated)] p-3 rounded whitespace-pre-wrap">
                {testCase.description}
              </p>
            </div>
          )}

          {/* Type & Priority */}
          <div className="grid grid-cols-3 gap-4">
            {testCase.type && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Type</p>
                <div className="inline-block bg-blue-500/10 text-blue-600 dark:text-blue-300 px-3 py-1 rounded text-xs font-medium">
                  {testCase.type}
                </div>
              </div>
            )}
            {testCase.priority && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Priority</p>
                <div className="inline-block bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded text-xs font-medium">
                  {testCase.priority}
                </div>
              </div>
            )}
            {testCase.severity && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Severity</p>
                <div className="inline-block bg-orange-500/10 text-orange-600 dark:text-orange-300 px-3 py-1 rounded text-xs font-medium">
                  {testCase.severity}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Steps */}
      {testCase?.steps && testCase.steps.length > 0 && (
        <div className="border-t border-[var(--border)] pt-4">
          <h4 className="text-sm font-semibold mb-3">Test Steps</h4>
          <div className="space-y-2">
            {testCase.steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                className="w-full text-left bg-[var(--bg-elevated)] p-3 rounded hover:bg-[var(--bg-elevated-hover)] transition"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{step.action || step.description}</p>
                    {expandedStep === index && step.expectedResult && (
                      <p className="text-xs text-[var(--muted)] mt-2">
                        <span className="font-semibold">Expected: </span>
                        {step.expectedResult}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    {expandedStep === index ? '▼' : '▶'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Execution Details (if available) */}
      {sourceExecution && (
        <div className="border-t border-[var(--border)] pt-4">
          <h4 className="text-sm font-semibold mb-3">Execution Details</h4>
          <div className="space-y-2 text-sm">
            {sourceExecution.executedAt && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Executed At:</span>
                <span>{new Date(sourceExecution.executedAt).toLocaleString()}</span>
              </div>
            )}
            {sourceExecution.duration && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Duration:</span>
                <span>{sourceExecution.duration}ms</span>
              </div>
            )}
            {sourceExecution.result && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Result:</span>
                <span className={`font-medium ${
                  sourceExecution.result === 'PASSED' 
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {sourceExecution.result}
                </span>
              </div>
            )}
          </div>

          {/* Evidence */}
          {sourceExecution.evidence && sourceExecution.evidence.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-[var(--muted)] mb-2">Evidence</p>
              <div className="flex flex-wrap gap-2">
                {sourceExecution.evidence.map((ev, idx) => (
                  <a
                    key={idx}
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded hover:bg-indigo-500/20 transition"
                  >
                    {ev.type === 'SCREENSHOT' && '📸'}
                    {ev.type === 'VIDEO' && '🎥'}
                    {ev.type === 'LOG' && '📋'}
                    {ev.name || `${ev.type}`}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Read-only Indicator */}
      <div className="text-xs text-[var(--muted)] italic bg-blue-500/5 p-2 rounded border border-blue-500/10">
        ℹ️ This is a read-only view of the test case details for reference.
      </div>
    </div>
  );
}
