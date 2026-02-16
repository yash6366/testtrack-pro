import { useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

/**
 * Custom hook for bug management operations
 */
export function useBug(bugId) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const changeBugStatus = useCallback(
    async (newStatus, reason = '') => {
      try {
        setSaving(true);
        setError('');
        const response = await apiClient.patch(`/api/bugs/${bugId}/status`, {
          newStatus,
          reason
        });
        return response;
      } catch (err) {
        const message = err.message || 'Failed to change status';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [bugId]
  );

  const assignBug = useCallback(
    async (assigneeId, reason = '') => {
      try {
        setSaving(true);
        setError('');
        const response = await apiClient.patch(`/api/bugs/${bugId}/assign`, {
          assigneeId,
          reason
        });
        return response;
      } catch (err) {
        const message = err.message || 'Failed to assign bug';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [bugId]
  );

  const addComment = useCallback(
    async (body, isInternal = false) => {
      try {
        setSaving(true);
        setError('');
        const response = await apiClient.post(`/api/bugs/${bugId}/comments`, {
          body,
          isInternal
        });
        return response;
      } catch (err) {
        const message = err.message || 'Failed to add comment';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [bugId]
  );

  const linkCommit = useCallback(
    async (commitHash, branchName = '', codeReviewUrl = '') => {
      try {
        setSaving(true);
        setError('');
        const response = await apiClient.patch(`/api/bugs/${bugId}/link-commit`, {
          commitHash,
          branchName,
          codeReviewUrl
        });
        return response;
      } catch (err) {
        const message = err.message || 'Failed to link commit';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [bugId]
  );

  const requestRetest = useCallback(
    async (notes = '', assignToTesterId = null) => {
      try {
        setSaving(true);
        setError('');
        const payload = { notes };
        if (assignToTesterId) {
          payload.testerId = assignToTesterId;
        }
        const response = await apiClient.post(`/api/bugs/${bugId}/retest-request`, payload);
        return response;
      } catch (err) {
        const message = err.message || 'Failed to request re-test';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [bugId]
  );

  const completeRetest = useCallback(
    async (retestRequestId, passed, retestExecutionId = null, notes = '') => {
      try {
        setSaving(true);
        setError('');
        const response = await apiClient.patch(
          `/api/bugs/${bugId}/retest/${retestRequestId}/complete`,
          {
            passed,
            retestExecutionId,
            notes
          }
        );
        return response;
      } catch (err) {
        const message = err.message || 'Failed to complete re-test';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [bugId]
  );

  return {
    saving,
    error,
    changeBugStatus,
    assignBug,
    addComment,
    linkCommit,
    requestRetest,
    completeRetest
  };
}
