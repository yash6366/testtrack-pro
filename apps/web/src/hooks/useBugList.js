import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

/**
 * Custom hook for bug list management
 */
export function useBugList(projectId, initialFilters = {}) {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalCount: 0
  });
  const [filters, setFilters] = useState({
    searchQuery: '',
    status: '',
    priority: '',
    severity: '',
    assignee: '',
    ...initialFilters
  });

  const fetchBugs = useCallback(async () => {
    if (!projectId) {
      setError('Project ID is required');
      setBugs([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        projectId: String(projectId),
        page: String(Math.max(1, pagination.currentPage)),
        limit: String(Math.max(1, Math.min(100, pagination.pageSize)))
      });

      // Add active filters (sanitize inputs)
      if (filters.searchQuery?.trim()) {
        params.append('search', filters.searchQuery.trim().slice(0, 100));
      }
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.assignee) params.append('assignee', filters.assignee);

      const response = await apiClient.get(`/api/bugs?${params}`);
      
      if (!response) {
        throw new Error('No response from server');
      }

      setBugs(Array.isArray(response.data) ? response.data : []);
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          totalCount: Number(response.pagination.totalCount) || 0
        }));
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch bugs';
      setError(errorMessage);
      setBugs([]);
      console.error('Failed to fetch bugs:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, pagination.currentPage, pagination.pageSize, filters]);

  // Fetch bugs when filters or page changes
  useEffect(() => {
    fetchBugs();
  }, [fetchBugs]);

  const updateFilter = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    // Reset to page 1 when filter changes
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      status: '',
      priority: '',
      severity: '',
      assignee: ''
    });
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  }, []);

  const goToPage = useCallback((pageNumber) => {
    const validPageNumber = Math.max(1, Number(pageNumber) || 1);
    setPagination(prev => ({
      ...prev,
      currentPage: validPageNumber
    }));
  }, []);

  const nextPage = useCallback(() => {
    const maxPage = Math.ceil(pagination.totalCount / pagination.pageSize);
    goToPage(Math.min(pagination.currentPage + 1, maxPage));
  }, [pagination.currentPage, pagination.totalCount, pagination.pageSize, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(Math.max(1, pagination.currentPage - 1));
  }, [pagination.currentPage, goToPage]);

  const pageCount = Math.ceil(pagination.totalCount / pagination.pageSize);

  return {
    bugs,
    loading,
    error,
    pagination: {
      ...pagination,
      pageCount
    },
    filters,
    updateFilter,
    clearFilters,
    goToPage,
    nextPage,
    prevPage,
    refetch: fetchBugs
  };
}
