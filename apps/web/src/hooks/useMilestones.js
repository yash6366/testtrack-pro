/**
 * MILESTONES CUSTOM HOOK
 * Manages milestone data fetching and state management
 */

import { useState, useCallback, useEffect } from 'react';
import API from '../lib/api';

export function useMilestones(projectId) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: null,
    priority: null,
    search: '',
    sortBy: 'targetEndDate',
    sortOrder: 'asc',
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    take: 20,
    total: 0,
  });

  // Fetch milestones
  const fetchMilestones = useCallback(async (customFilters = {}, customPagination = {}) => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const queryFilters = { ...filters, ...customFilters };
      const queryPagination = { ...pagination, ...customPagination };

      const response = await API.get(`/api/projects/${projectId}/milestones`, {
        params: {
          ...queryFilters,
          ...queryPagination,
        },
      });

      setMilestones(response.data.data);
      setPagination({
        skip: response.data.skip,
        take: response.data.take,
        total: response.data.total,
      });
      setFilters(queryFilters);
    } catch (err) {
      console.error('Failed to fetch milestones:', err);
      setError(err.response?.data?.error || 'Failed to fetch milestones');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters, pagination]);

  // Initial fetch
  useEffect(() => {
    if (projectId) {
      fetchMilestones();
    }
  }, [projectId]);

  // Create milestone
  const createMilestone = useCallback(async (data) => {
    try {
      const response = await API.post(`/api/projects/${projectId}/milestones`, data);
      setMilestones([...milestones, response.data]);
      return response.data;
    } catch (err) {
      console.error('Failed to create milestone:', err);
      throw err.response?.data?.error || 'Failed to create milestone';
    }
  }, [projectId, milestones]);

  // Update milestone
  const updateMilestone = useCallback(async (milestoneId, data) => {
    try {
      const response = await API.patch(
        `/api/projects/${projectId}/milestones/${milestoneId}`,
        data
      );
      setMilestones(
        milestones.map(m => (m.id === milestoneId ? response.data : m))
      );
      return response.data;
    } catch (err) {
      console.error('Failed to update milestone:', err);
      throw err.response?.data?.error || 'Failed to update milestone';
    }
  }, [projectId, milestones]);

  // Delete milestone
  const deleteMilestone = useCallback(async (milestoneId) => {
    try {
      await API.delete(`/api/projects/${projectId}/milestones/${milestoneId}`);
      setMilestones(milestones.filter(m => m.id !== milestoneId));
    } catch (err) {
      console.error('Failed to delete milestone:', err);
      throw err.response?.data?.error || 'Failed to delete milestone';
    }
  }, [projectId, milestones]);

  // Assign test cases to milestone
  const assignTestCases = useCallback(async (milestoneId, testCaseIds) => {
    try {
      await API.post(
        `/api/projects/${projectId}/milestones/${milestoneId}/assign-test-cases`,
        { ids: testCaseIds }
      );
      await fetchMilestones({}, {});
    } catch (err) {
      console.error('Failed to assign test cases:', err);
      throw err.response?.data?.error || 'Failed to assign test cases';
    }
  }, [projectId]);

  // Assign defects to milestone
  const assignDefects = useCallback(async (milestoneId, defectIds) => {
    try {
      await API.post(
        `/api/projects/${projectId}/milestones/${milestoneId}/assign-defects`,
        { ids: defectIds }
      );
      await fetchMilestones({}, {});
    } catch (err) {
      console.error('Failed to assign defects:', err);
      throw err.response?.data?.error || 'Failed to assign defects';
    }
  }, [projectId]);

  // Get milestone progress
  const getMilestoneProgress = useCallback(async (milestoneId) => {
    try {
      const response = await API.get(
        `/api/projects/${projectId}/milestones/${milestoneId}/progress`
      );
      return response.data;
    } catch (err) {
      console.error('Failed to fetch milestone progress:', err);
      throw err.response?.data?.error || 'Failed to fetch milestone progress';
    }
  }, [projectId]);

  // Get project summary
  const getProjectSummary = useCallback(async () => {
    try {
      const response = await API.get(
        `/api/projects/${projectId}/milestones-summary`
      );
      return response.data;
    } catch (err) {
      console.error('Failed to fetch milestones summary:', err);
      throw err.response?.data?.error || 'Failed to fetch milestones summary';
    }
  }, [projectId]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    fetchMilestones(newFilters, { skip: 0 });
  }, [fetchMilestones]);

  // Handle pagination
  const handlePageChange = useCallback((skip, take) => {
    setPagination(prev => ({ ...prev, skip, take }));
    fetchMilestones({}, { skip, take });
  }, [fetchMilestones]);

  return {
    milestones,
    loading,
    error,
    filters,
    pagination,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    assignTestCases,
    assignDefects,
    getMilestoneProgress,
    getProjectSummary,
    handleFilterChange,
    handlePageChange,
    refetch: fetchMilestones,
  };
}
