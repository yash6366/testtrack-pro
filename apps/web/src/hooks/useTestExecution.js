import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

/**
 * Custom hook for managing test execution state
 */
export function useTestExecution(executionId) {
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load execution data
  const loadExecution = useCallback(async () => {
    if (!executionId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get(`/api/test-executions/${executionId}`);
      setExecution(data);
    } catch (err) {
      console.error('Failed to load execution:', err);
      setError(err.message || 'Failed to load execution');
    } finally {
      setLoading(false);
    }
  }, [executionId]);

  // Initial load
  useEffect(() => {
    loadExecution();
  }, [loadExecution]);

  // Update step status
  const updateStepStatus = useCallback(
    async (stepId, status, actualResult, notes) => {
      if (!executionId) {
        throw new Error('Execution ID is required');
      }

      if (!status) {
        throw new Error('Status is required');
      }

      try {
        setIsSaving(true);
        setError(null);
        const response = await apiClient.patch(
          `/api/test-executions/${executionId}/steps/${stepId}`,
          {
            status,
            actualResult: actualResult?.trim() || null,
            notes: notes?.trim() || null,
          }
        );

        // Update local state
        if (response && response.execution) {
          setExecution(response.execution);
        }
        return response;
      } catch (err) {
        const errorMessage = err.message || 'Failed to update step';
        setError(errorMessage);
        console.error('Failed to update step:', err);
        throw new Error(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [executionId]
  );

  // Complete execution
  const completeExecution = useCallback(
    async (comments) => {
      if (!executionId) {
        throw new Error('Execution ID is required');
      }

      try {
        setIsSaving(true);
        setError(null);
        const response = await apiClient.patch(
          `/api/test-executions/${executionId}/complete`,
          { comments: comments?.trim() || '' }
        );
        if (response) {
          setExecution(response);
        }
        return response;
      } catch (err) {
        const errorMessage = err.message || 'Failed to complete execution';
        setError(errorMessage);
        console.error('Failed to complete execution:', err);
        throw new Error(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [executionId]
  );

  // Auto-save progress
  const saveProgress = useCallback(async () => {
    if (!executionId) return;

    try {
      const response = await apiClient.patch(
        `/api/test-executions/${executionId}/progress`,
        {}
      );
      return response;
    } catch (err) {
      console.error('Failed to save progress:', err);
      // Don't throw - auto-save failures shouldn't break the app
    }
  }, [executionId]);

  // Get execution history
  const getHistory = useCallback(async (testCaseId) => {
    if (!testCaseId) return null;

    try {
      const response = await apiClient.get(
        `/api/test-cases/${testCaseId}/execution-history`
      );
      return response.history;
    } catch (err) {
      console.error('Failed to fetch execution history:', err);
      return null;
    }
  }, []);

  // Compare executions
  const compareExecutions = useCallback(
    async (otherExecutionId) => {
      if (!executionId || !otherExecutionId) return null;

      try {
        const response = await apiClient.get(
          `/api/test-executions/${executionId}/compare/${otherExecutionId}`
        );
        return response;
      } catch (err) {
        console.error('Failed to compare executions:', err);
        return null;
      }
    },
    [executionId]
  );

  // Link or clear a defect for this execution
  const linkDefect = useCallback(
    async (defectId) => {
      if (!executionId) {
        throw new Error('Execution ID is required');
      }

      // Validate defectId is either null or a positive number
      if (defectId !== null && (typeof defectId !== 'number' || defectId <= 0)) {
        throw new Error('Defect ID must be a positive number or null');
      }

      try {
        setIsSaving(true);
        setError(null);
        const response = await apiClient.patch(
          `/api/test-executions/${executionId}/defect`,
          { defectId }
        );

        setExecution((prev) =>
          prev ? { ...prev, defectId: response.defectId } : response
        );

        return response;
      } catch (err) {
        const errorMessage = err.message || 'Failed to link defect';
        setError(errorMessage);
        console.error('Failed to link defect:', err);
        throw new Error(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [executionId]
  );

  return {
    execution,
    loading,
    error,
    isSaving,
    updateStepStatus,
    completeExecution,
    saveProgress,
    getHistory,
    compareExecutions,
    linkDefect,
    reload: loadExecution,
  };
}

export default useTestExecution;
