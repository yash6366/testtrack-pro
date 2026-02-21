import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks';
import { apiClient } from '@/lib/apiClient';

export const ProjectContext = createContext(null);

const STORAGE_KEY = 'selectedProjectId';

export function ProjectProvider({ children }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setActiveProjectId = useCallback((projectId) => {
    const nextId = Number(projectId);
    if (!Number.isFinite(nextId)) return;
    setSelectedProjectId(nextId);
    localStorage.setItem(STORAGE_KEY, String(nextId));
  }, []);

  const resolveSelection = useCallback((availableProjects) => {
    if (!availableProjects || availableProjects.length === 0) {
      setSelectedProjectId(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    const storedId = stored ? Number(stored) : null;
    const hasStored = storedId && availableProjects.some((project) => project.id === storedId);

    const nextId = hasStored ? storedId : availableProjects[0].id;
    setSelectedProjectId(nextId);
    localStorage.setItem(STORAGE_KEY, String(nextId));
  }, []);

  const loadProjects = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const normalizedRole = String(user.role || '').toUpperCase();
      const endpoint = normalizedRole === 'ADMIN'
        ? '/api/admin/projects?take=100'
        : '/api/tester/projects?take=100';

      const response = await apiClient.get(endpoint);
      const nextProjects = response.projects || [];

      setProjects(nextProjects);
      // Root cause fix: ensure a valid project is selected on app load for all pages.
      resolveSelection(nextProjects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjects([]);
      setSelectedProjectId(null);
      localStorage.removeItem(STORAGE_KEY);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [user, resolveSelection]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setProjects([]);
      setSelectedProjectId(null);
      setError('');
      setLoading(false);
      return;
    }

    loadProjects();
  }, [authLoading, isAuthenticated, loadProjects]);

  const selectedProject = useMemo(() => (
    projects.find((project) => project.id === Number(selectedProjectId)) || null
  ), [projects, selectedProjectId]);

  const value = useMemo(() => ({
    projects,
    selectedProject,
    selectedProjectId,
    loading,
    error,
    reloadProjects: loadProjects,
    setActiveProjectId,
  }), [projects, selectedProject, selectedProjectId, loading, error, loadProjects, setActiveProjectId]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export default ProjectContext;
