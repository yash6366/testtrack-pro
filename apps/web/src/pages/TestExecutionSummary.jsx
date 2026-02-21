import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { apiClient } from '@/lib/apiClient';
import BackButton from '@/components/ui/BackButton';
import Breadcrumb from '@/components/ui/Breadcrumb';

/**
 * TestExecutionSummary Page
 * Display results and summary after test execution completion
 */
export default function TestExecutionSummary() {
  const navigate = useNavigate();
  const { executionId } = useParams();
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

  const [execution, setExecution] = useState(null);
  const [testRun, setTestRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reexecuteLoading, setReexecuteLoading] = useState(false);
  const [reexecuteError, setReexecuteError] = useState('');

  // Load execution data
  useEffect(() => {
    const loadExecution = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await apiClient.get(
          `/api/test-executions/${executionId}`
        );

        if (response.testExecution) {
          setExecution(response.testExecution);
          setTestRun(response.testExecution.testRun);
        }
      } catch (err) {
        console.error('Error loading execution:', err);
        setError('Failed to load test execution summary');
      } finally {
        setLoading(false);
      }
    };

    if (executionId) {
      loadExecution();
    }
  }, [executionId]);

  const handleReexecute = async () => {
    if (!executionId) return;

    try {
      setReexecuteLoading(true);
      setReexecuteError('');
      const response = await apiClient.post(
        `/api/test-executions/${executionId}/re-execute`,
        {}
      );

      if (response?.executionId) {
        navigate(`/test-execution/${response.executionId}`);
      } else {
        setReexecuteError('Unable to start re-execution');
      }
    } catch (err) {
      setReexecuteError(err.message || 'Failed to start re-execution');
    } finally {
      setReexecuteLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASSED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30';
      case 'BLOCKED':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-600 border-amber-500/30';
      case 'SKIPPED':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASSED':
        return '✓';
      case 'FAILED':
        return '✗';
      case 'BLOCKED':
        return '⊗';
      case 'SKIPPED':
        return '−';
      default:
        return '?';
    }
  };

  const getProgressColor = (status) => {
    switch (status) {
      case 'PASSED':
        return 'bg-emerald-500';
      case 'FAILED':
        return 'bg-rose-500';
      case 'BLOCKED':
        return 'bg-amber-500';
      case 'SKIPPED':
        return 'bg-slate-500';
      default:
        return 'bg-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[var(--border)] border-t-blue-500 rounded-full mx-auto mb-4" />
          <p className="text-[var(--muted)]">Loading execution summary...</p>
        </div>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <BackButton label="Back to Reports" fallback="/reports" />
          <div className="tt-card p-6 text-center">
            <p className="text-rose-600 mb-4">{error}</p>
            <BackButton label="Back to Dashboard" fallback="/dashboard" className="justify-center" />
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    total: execution.steps?.length || 0,
    passed: execution.steps?.filter((s) => s.status === 'PASSED').length || 0,
    failed: execution.steps?.filter((s) => s.status === 'FAILED').length || 0,
    blocked: execution.steps?.filter((s) => s.status === 'BLOCKED').length || 0,
    skipped: execution.steps?.filter((s) => s.status === 'SKIPPED').length || 0,
  };

  const passRate =
    stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col gap-3 mb-4">
            <BackButton label="Back to Reports" fallback="/reports" />
            <Breadcrumb
              crumbs={[
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Reports', path: '/reports' },
                testRun?.id
                  ? { label: testRun?.name || `Test Run #${testRun.id}`, path: `/test-run/${testRun.id}` }
                  : { label: 'Test Run', path: null },
                { label: 'Execution Summary', path: null },
              ]}
            />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl font-bold ${getStatusColor(execution.status)}`}
            >
              {getStatusIcon(execution.status)}
            </div>
            <div>
              <h1 className="text-3xl font-bold">Test Execution Summary</h1>
              <p className="text-[var(--muted)]">
                {execution.testCase?.name}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(
                execution.status
              )}`}
            >
              {execution.status}
            </span>
            <span className="text-sm text-[var(--muted)]">
              {testRun?.name}
            </span>
            {testRun?.environment && (
              <span className="text-xs px-3 py-1 bg-[var(--border)] rounded-full">
                {testRun.environment}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="tt-card p-4 text-center">
            <div className="text-3xl font-bold text-[var(--foreground)] mb-1">
              {stats.total}
            </div>
            <div className="text-xs text-[var(--muted)]">Total Steps</div>
          </div>
          <div className="tt-card p-4 text-center border-emerald-500/30">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              {stats.passed}
            </div>
            <div className="text-xs text-[var(--muted)]">Passed</div>
          </div>
          <div className="tt-card p-4 text-center border-rose-500/30">
            <div className="text-3xl font-bold text-rose-600 dark:text-rose-400 mb-1">
              {stats.failed}
            </div>
            <div className="text-xs text-[var(--muted)]">Failed</div>
          </div>
          <div className="tt-card p-4 text-center border-amber-500/30">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">
              {stats.blocked}
            </div>
            <div className="text-xs text-[var(--muted)]">Blocked</div>
          </div>
          <div className="tt-card p-4 text-center border-slate-500/30">
            <div className="text-3xl font-bold text-slate-600 dark:text-slate-400 mb-1">
              {stats.skipped}
            </div>
            <div className="text-xs text-[var(--muted)]">Skipped</div>
          </div>
        </div>

        {/* Pass Rate */}
        <div className="tt-card mb-8">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Pass Rate</h3>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {passRate}%
              </span>
            </div>
            <div className="w-full bg-[var(--border)] rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${passRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Results */}
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold">Step Results</h3>
          </div>

          {execution.steps && execution.steps.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {execution.steps.map((step, index) => (
                <div key={step.id} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${getStatusColor(
                        step.status
                      )}`}
                    >
                      {getStatusIcon(step.status)}
                    </div>

                    {/* Step Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--foreground)]">
                          Step {index + 1}: {step.testStep?.action}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(
                            step.status
                          )}`}
                        >
                          {step.status}
                        </span>
                      </div>

                      {step.testStep?.expectedResult && (
                        <div className="text-sm mb-2">
                          <span className="text-[var(--muted)]">Expected: </span>
                          <span className="text-[var(--foreground)]">
                            {step.testStep.expectedResult}
                          </span>
                        </div>
                      )}

                      {step.actualResult && (
                        <div className="text-sm mb-2">
                          <span className="text-[var(--muted)]">Actual: </span>
                          <span className="text-[var(--foreground)]">
                            {step.actualResult}
                          </span>
                        </div>
                      )}

                      {step.notes && (
                        <div className="text-sm text-[var(--muted)] bg-[var(--border)]/20 p-2 rounded mt-2">
                          <strong>Notes:</strong> {step.notes}
                        </div>
                      )}

                      {step.durationSeconds && (
                        <div className="text-xs text-[var(--muted)] mt-2">
                          Duration: {Math.floor(step.durationSeconds / 60)}m{' '}
                          {step.durationSeconds % 60}s
                        </div>
                      )}

                      {/* Evidence */}
                      {step.evidence && step.evidence.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-[var(--muted)]">
                            📎 {step.evidence.length} attachment
                            {step.evidence.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-[var(--muted)]">
              No steps recorded
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-8 flex-wrap justify-center">
          <button
            onClick={() => navigate(`/test-run/${testRun?.id}`)}
            className="tt-btn tt-btn-outline"
          >
            View Test Run
          </button>
          {!isAdmin && (
            <button
              onClick={handleReexecute}
              disabled={reexecuteLoading}
              className="tt-btn tt-btn-outline"
            >
              {reexecuteLoading ? 'Starting...' : 'Re-execute Test'}
            </button>
          )}
          <BackButton label="Back to Dashboard" fallback="/dashboard" className="tt-btn tt-btn-primary" />
          {execution.testCaseId && (
            <button
              onClick={() => navigate(`/test-cases/${execution.testCaseId}`)}
              className="tt-btn tt-btn-outline"
            >
              View Test Case
            </button>
          )}
        </div>
        {reexecuteError && (
          <p className="text-sm text-rose-500 text-center mt-3">{reexecuteError}</p>
        )}
      </div>
    </div>
  );
}
