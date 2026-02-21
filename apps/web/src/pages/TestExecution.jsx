import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import useTestExecution from '@/hooks/useTestExecution';
import useExecutionTimer from '@/hooks/useExecutionTimer';
import StepNavigator from '@/components/StepNavigator';
import ActualResultInput from '@/components/ActualResultInput';
import StepResultSelector from '@/components/StepResultSelector';
import ExecutionTimer from '@/components/ExecutionTimer';
import TestExecutionComments from '@/components/TestExecutionComments';
import BugCreationModal from '@/components/BugCreationModal';
import BackButton from '@/components/ui/BackButton';
import Breadcrumb from '@/components/ui/Breadcrumb';

/**
 * TestExecution Page
 * Main test execution screen for step-by-step test execution
 */
export default function TestExecution() {
  const navigate = useNavigate();
  const { executionId } = useParams();
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const noop = () => {};

  const {
    execution,
    loading,
    error,
    updateStepStatus,
    completeExecution,
    saveProgress,
    getHistory,
    compareExecutions,
    linkDefect,
  } = useTestExecution(executionId);

  const {
    seconds,
    isRunning,
    isPaused,
    pause,
    resume,
    stop,
    lastSaved,
    updateLastSaved,
  } = useExecutionTimer(execution?.startedAt);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [actualResult, setActualResult] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [comparison, setComparison] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState('');
  const [selectedComparisonId, setSelectedComparisonId] = useState('');
  const [defectIdInput, setDefectIdInput] = useState('');
  const [defectSaving, setDefectSaving] = useState(false);
  const [defectError, setDefectError] = useState('');
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugCreationContext, setBugCreationContext] = useState(null);

  // Load initial step status
  useEffect(() => {
    if (execution && execution.steps && execution.steps.length > 0) {
      const currentStep = execution.steps[currentStepIndex];
      if (currentStep) {
        setActualResult(currentStep.actualResult || '');
        setNotes(currentStep.notes || '');
        setSelectedStatus(currentStep.status || '');
      }
    }
  }, [currentStepIndex, execution]);

  // Load execution history for the current test case
  useEffect(() => {
    if (!execution?.testCaseId) return;
    let isActive = true;

    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError('');

      try {
        const historyData = await getHistory(execution.testCaseId);
        if (!isActive) return;

        if (historyData && Array.isArray(historyData)) {
          setHistory(historyData.filter((item) => item.id !== Number(executionId)));
          setHistoryError('');
        } else {
          setHistory([]);
          setHistoryError('Unable to load execution history');
        }
      } catch (err) {
        if (isActive) {
          setHistory([]);
          setHistoryError(err.message || 'Failed to load history');
        }
      } finally {
        if (isActive) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isActive = false;
    };
  }, [execution?.testCaseId, executionId, getHistory]);

  const handleStepStatusUpdate = async () => {
    if (!execution || !selectedStatus) {
      alert('Please select a status for this step');
      return;
    }

    const currentStep = execution.steps[currentStepIndex];
    if (!currentStep) return;

    try {
      setSubmitting(true);
      const response = await updateStepStatus(
        currentStep.stepId,
        selectedStatus,
        actualResult,
        notes
      );

      // Move to next step or complete
      if (currentStepIndex < execution.steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
        setActualResult('');
        setNotes('');
        setSelectedStatus('');
      } else {
        // Last step - offer to complete
        const shouldComplete = window.confirm(
          'You have marked the last step. Would you like to complete the execution?'
        );

        if (shouldComplete) {
          stop();
          await completeExecution('Execution completed');
          navigate(`/test-execution/${executionId}/summary`);
        }
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setActualResult('');
      setNotes('');
      setSelectedStatus('');
    }
  };

  const handleCompleteExecution = async () => {
    const shouldComplete = window.confirm(
      'Are you sure you want to complete this execution? Make sure all steps are marked.'
    );

    if (!shouldComplete) return;

    try {
      setSubmitting(true);
      stop();
      await completeExecution('');
      navigate(`/test-execution/${executionId}/summary`);
    } catch (err) {
      alert(`Error: ${err.message}`);
      // Don't stop timer on error
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSave = async () => {
    if (!executionId) return;
    await saveProgress();
    updateLastSaved();
  };

  const handleCompare = async () => {
    if (!selectedComparisonId) {
      setComparisonError('Please select an execution to compare');
      return;
    }

    setComparisonLoading(true);
    setComparisonError('');

    try {
      const data = await compareExecutions(selectedComparisonId);
      if (!data) {
        setComparisonError('Unable to compare executions');
        setComparison(null);
      } else {
        setComparison(data);
      }
    } catch (err) {
      setComparisonError(err.message || 'Failed to compare executions');
      setComparison(null);
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleLinkDefect = async () => {
    try {
      setDefectSaving(true);
      setDefectError('');
      
      const defectIdValue = defectIdInput?.trim();
      const defectIdNumber = defectIdValue ? Number(defectIdValue) : null;
      
      if (defectIdValue && (isNaN(defectIdNumber) || defectIdNumber <= 0)) {
        setDefectError('Defect ID must be a positive number');
        return;
      }
      
      await linkDefect(defectIdNumber);
      setDefectIdInput('');
    } catch (err) {
      setDefectError(err.message || 'Failed to link defect');
    } finally {
      setDefectSaving(false);
    }
  };

  const handleFailAndCreateBug = () => {
    if (!currentStep) return;
    
    // Build description with execution context
    const descriptionLines = [];
    descriptionLines.push(`**Test Case:** ${execution?.testCase?.name}`);
    descriptionLines.push(`**Step ${currentStepIndex + 1}:** ${currentStep.testStep?.action}`);
    descriptionLines.push('');
    descriptionLines.push('**Expected Result:**');
    descriptionLines.push(currentStep.testStep?.expectedResult || 'N/A');
    descriptionLines.push('');
    descriptionLines.push('**Actual Result:**');
    descriptionLines.push(actualResult || 'N/A');
    if (notes) {
      descriptionLines.push('');
      descriptionLines.push('**Notes:**');
      descriptionLines.push(notes);
    }
    
    setBugCreationContext({
      executionId: executionId,
      testCaseId: execution?.testCaseId,
      testTitle: `Failed: ${execution?.testCase?.name} - Step ${currentStepIndex + 1}`,
      description: descriptionLines.join('\\n'),
    });
    setShowBugModal(true);
  };

  const handleBugCreated = async (bug) => {
    // Link the newly created bug to this execution
    if (bug && bug.id) {
      try {
        await linkDefect(bug.id);
      } catch (err) {
        console.error('Failed to link bug to execution:', err);
      }
    }
    setShowBugModal(false);
    setBugCreationContext(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[var(--border)] border-t-blue-500 rounded-full mx-auto mb-4" />
          <p className="text-[var(--muted)]">Loading execution...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-6 flex items-center justify-center">
        <div className="tt-card max-w-md w-full p-6">
          <h1 className="text-2xl font-bold text-rose-600 mb-4">Error</h1>
          <p className="text-[var(--muted)] mb-6">{error}</p>
          <BackButton label="Back to Dashboard" fallback="/dashboard" className="w-full justify-center" />
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-6 flex items-center justify-center">
        <div className="tt-card max-w-md w-full p-6 text-center">
          <p className="text-[var(--muted)]">Execution not found</p>
          <div className="mt-6">
            <BackButton label="Back to Dashboard" fallback="/dashboard" className="w-full justify-center" />
          </div>
        </div>
      </div>
    );
  }

  const currentStep = execution.steps?.[currentStepIndex];
  const progressPercent =
    execution.steps.length > 0
      ? Math.round(
          ((currentStepIndex + 1) / execution.steps.length) * 100
        )
      : 0;
  const completedSteps =
    execution.steps?.filter((s) =>
      ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'].includes(s.status)
    ).length || 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 mb-4">
            <BackButton label="Back to Reports" fallback="/reports" />
            <Breadcrumb
              crumbs={[
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Reports', path: '/reports' },
                execution.testRun?.id
                  ? { label: execution.testRun?.name || `Test Run #${execution.testRun.id}`, path: `/test-run/${execution.testRun.id}` }
                  : { label: 'Test Run', path: null },
                { label: execution.testCase?.name || 'Execution', path: null },
              ]}
            />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">
                {execution.testCase?.name}
              </h1>
              <p className="text-sm text-[var(--muted)]">
                Run: {execution.testRun?.name || 'N/A'} •{' '}
                {execution.testRun?.environment && `Env: ${execution.testRun.environment} • `}
                Build: {execution.testRun?.buildVersion || 'N/A'}
              </p>
            </div>

            {/* Status Badge */}
            <div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  execution.status === 'PASSED'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : execution.status === 'FAILED'
                    ? 'bg-rose-500/10 text-rose-600'
                    : execution.status === 'BLOCKED'
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-blue-500/10 text-blue-600'
                }`}
              >
                {execution.status}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                Step {currentStepIndex + 1} of {execution.steps?.length || 0}
              </span>
              <span className="text-[var(--muted)]">
                {completedSteps} / {execution.steps?.length || 0} marked
              </span>
            </div>
            <div className="w-full bg-[var(--border)] rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar: Step Navigator & Timer */}
          <div className="lg:col-span-1 space-y-6">
            {/* Timer */}
            <ExecutionTimer
              seconds={seconds}
              isRunning={isRunning}
              isPaused={isPaused}
              onPause={isAdmin ? noop : pause}
              onResume={isAdmin ? noop : resume}
              lastSaved={lastSaved}
              onAutoSave={isAdmin ? null : handleAutoSave}
            />

            {/* Step Navigator */}
            <StepNavigator
              steps={execution.steps || []}
              currentStepIndex={currentStepIndex}
              onStepSelect={setCurrentStepIndex}
              disabled={submitting || isAdmin}
            />
          </div>

          {/* Center/Right: Execution Panel */}
          <div className="lg:col-span-3">
            {isAdmin && (
              <div className="tt-card mb-6 p-4 border border-amber-300 bg-amber-50 text-amber-900">
                Read-only access: Admins cannot execute test cases or modify test results.
              </div>
            )}
            {currentStep && (
              <div className="tt-card">
                <div className="px-6 py-4 border-b border-[var(--border)]">
                  <h2 className="text-xl font-semibold">
                    Step {currentStepIndex + 1}: {currentStep.testStep?.action}
                  </h2>
                </div>

                <div className="p-6 space-y-8 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {/* Expected Result */}
                  <section>
                    <h3 className="text-sm font-medium text-[var(--foreground)] mb-2">
                      Expected Result
                    </h3>
                    <div
                      className="bg-[var(--bg-elevated)] p-4 rounded-lg border border-[var(--border)] 
                        text-sm leading-relaxed text-[var(--foreground)]"
                    >
                      {currentStep.testStep?.expectedResult ||
                        'No expected result defined'}
                    </div>
                  </section>

                  {/* Actual Result Input */}
                  <section>
                    <ActualResultInput
                      expectedResult={currentStep.testStep?.expectedResult}
                      actualResult={actualResult}
                      onChange={setActualResult}
                      disabled={submitting || isAdmin}
                      maxLength={2000}
                    />
                  </section>

                  {/* Notes */}
                  <section>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Notes / Observations
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any observations or issues encountered..."
                      disabled={submitting || isAdmin}
                      maxLength={1000}
                      rows={3}
                      className={`w-full p-3 border border-[var(--border)] rounded-lg 
                        bg-[var(--bg)] text-sm focus:outline-none focus:ring-2 
                        focus:ring-offset-0 focus:ring-blue-500 placeholder-[var(--muted)]
                        resize-none transition-all ${
                          submitting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    />
                  </section>

                  {/* Evidence Upload */}
                  {!isAdmin && (
                    <section>
                      <TestExecutionComments
                        projectId={execution.testRun?.projectId}
                        testExecutionId={executionId}
                        stepId={currentStep.stepId}
                        testName={execution.testCase?.name || 'Test'}
                        onClose={() => {}}
                      />
                    </section>
                  )}

                  {/* Step Result Selection */}
                  <section>
                    <StepResultSelector
                      value={selectedStatus}
                      onChange={setSelectedStatus}
                      disabled={submitting || isAdmin}
                    />
                  </section>

                  {/* Defect Linking */}
                  {!isAdmin && (
                    <section>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[var(--foreground)]">
                        Bug / Defect Management
                      </label>
                      {execution.defectId && (
                        <span className="text-xs text-[var(--muted)]">
                          Linked: #{execution.defectId}
                        </span>
                      )}
                    </div>
                    
                    {/* Create Bug Button */}
                    <button
                      onClick={handleFailAndCreateBug}
                      className="w-full tt-btn tt-btn-outline py-2 mb-3 flex items-center justify-center gap-2 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300"
                    >
                      <span className="text-lg">🐛</span>
                      Fail & Create Bug Report
                    </button>
                    
                    {/* Or link existing defect */}
                    <div className="border-t border-[var(--border)] pt-3">
                      <p className="text-xs text-[var(--muted)] mb-2">Or link existing defect:</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={defectIdInput}
                          onChange={(e) => setDefectIdInput(e.target.value)}
                          placeholder="Enter defect ID"
                          disabled={defectSaving}
                          className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg 
                            bg-[var(--bg)] text-sm focus:outline-none focus:ring-2 
                            focus:ring-offset-0 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleLinkDefect}
                          disabled={defectSaving}
                          className="tt-btn tt-btn-outline px-4"
                        >
                          {defectSaving ? 'Saving...' : 'Link'}
                        </button>
                      </div>
                      {defectError && (
                        <p className="text-xs text-rose-500 mt-2">{defectError}</p>
                      )}
                    </div>
                  </section>
                  )}

                  {/* Navigation Buttons */}
                  {!isAdmin && (
                    <>
                      <section className="flex gap-3 pt-6 border-t border-[var(--border)]">
                        <button
                          onClick={handlePreviousStep}
                          disabled={currentStepIndex === 0 || submitting}
                          className={`flex-1 tt-btn py-3 flex items-center justify-center gap-2 
                            ${
                              currentStepIndex === 0 || submitting
                                ? 'tt-btn-outline opacity-50 cursor-not-allowed'
                                : 'tt-btn-outline hover:border-[var(--foreground)]'
                            }`}
                        >
                          ← Previous Step
                        </button>

                        <button
                          onClick={handleStepStatusUpdate}
                          disabled={!selectedStatus || submitting}
                          className={`flex-1 tt-btn py-3 flex items-center justify-center gap-2 
                            ${
                              !selectedStatus || submitting
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }
                            ${currentStepIndex === execution.steps.length - 1 ? 'tt-btn-primary' : 'tt-btn-primary'}`}
                        >
                          {submitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : currentStepIndex === execution.steps.length - 1 ? (
                            <>
                              ✓ Mark & Complete
                            </>
                          ) : (
                            <>
                              Save & Next Step →
                            </>
                          )}
                        </button>
                      </section>

                      {/* Complete Button */}
                      {currentStepIndex === execution.steps.length - 1 && (
                        <button
                          onClick={handleCompleteExecution}
                          disabled={submitting}
                          className="w-full tt-btn tt-btn-primary py-3 font-semibold"
                        >
                          🏁 Complete Execution
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Execution History & Comparison */}
            <div className="tt-card mt-6">
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h3 className="text-lg font-semibold">Execution History</h3>
                <p className="text-xs text-[var(--muted)]">
                  Previous runs for this test case
                </p>
              </div>

              <div className="p-6 space-y-4">
                {historyLoading && (
                  <p className="text-sm text-[var(--muted)]">Loading history...</p>
                )}
                {historyError && (
                  <p className="text-sm text-rose-500">{historyError}</p>
                )}
                {!historyLoading && history.length === 0 && !historyError && (
                  <p className="text-sm text-[var(--muted)]">No previous executions found.</p>
                )}

                {history.length > 0 && (
                  <div className="space-y-3">
                    {history.map((item) => {
                      const passedCount = item.steps?.filter((s) => s.status === 'PASSED').length || 0;
                      const failedCount = item.steps?.filter((s) => s.status === 'FAILED').length || 0;
                      const blockedCount = item.steps?.filter((s) => s.status === 'BLOCKED').length || 0;
                      const skippedCount = item.steps?.filter((s) => s.status === 'SKIPPED').length || 0;

                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 border border-[var(--border)] rounded-lg p-3"
                        >
                          <input
                            type="radio"
                            name="execution-compare"
                            value={item.id}
                            checked={String(selectedComparisonId) === String(item.id)}
                            onChange={(e) => setSelectedComparisonId(e.target.value)}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {item.testRun?.name || 'Test Run'}
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                              {new Date(item.createdAt).toLocaleString()} • {item.executor?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-[var(--muted)] mt-1">
                              Passed: {passedCount} • Failed: {failedCount} • Blocked: {blockedCount} • Skipped: {skippedCount}
                            </div>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full 
                              ${
                                item.status === 'PASSED'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : item.status === 'FAILED'
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : item.status === 'BLOCKED'
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-slate-500/10 text-slate-600'
                              }`}
                          >
                            {item.status}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {history.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={handleCompare}
                      disabled={!selectedComparisonId || comparisonLoading}
                      className="tt-btn tt-btn-outline"
                    >
                      {comparisonLoading ? 'Comparing...' : 'Compare Selected'}
                    </button>
                    {comparisonError && (
                      <p className="text-sm text-rose-500 mt-2">{comparisonError}</p>
                    )}
                  </div>
                )}

                {comparison && (
                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <h4 className="text-sm font-semibold mb-2">Differences</h4>
                    {comparison.differences.length === 0 && (
                      <p className="text-sm text-[var(--muted)]">
                        No differences found between executions.
                      </p>
                    )}
                    {comparison.differences.length > 0 && (
                      <div className="space-y-2">
                        {comparison.differences.map((diff) => (
                          <div key={`${diff.stepNumber}-${diff.stepName}`} className="text-sm">
                            <div className="font-medium">
                              Step {diff.stepNumber}: {diff.stepName}
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                              Previous: {diff.previousStatus || 'N/A'} • Current: {diff.currentStatus || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bug Creation Modal */}
      {showBugModal && bugCreationContext && (
        <BugCreationModal
          isOpen={showBugModal}
          executionId={bugCreationContext.executionId}
          testCaseId={bugCreationContext.testCaseId}
          testTitle={bugCreationContext.testTitle}
          initialDescription={bugCreationContext.description}
          onClose={() => {
            setShowBugModal(false);
            setBugCreationContext(null);
          }}
          onSuccess={handleBugCreated}
        />
      )}
    </div>
  );
}
