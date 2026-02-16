import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import DashboardLayout from '@/components/DashboardLayout';
import { apiClient } from '@/lib/apiClient';
import { FolderKanban, Plus, Search, ChevronRight } from 'lucide-react';

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        setLoading(true);
        setError('');

        // Load projects based on user role
        let response;
        if (user?.role === 'ADMIN') {
          response = await apiClient.get('/api/admin/projects');
        } else {
          response = await apiClient.get('/api/projects');
        }

        if (isMounted) {
          setProjects(response.projects || response || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load projects');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProjectClick = (projectId) => {
    // Store selected project
    localStorage.setItem('selectedProjectId', projectId);
    navigate(`/projects/${projectId}`);
  };

  const filteredProjects = projects.filter((project) =>
    project.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Projects"
      headerTitle="All Projects"
      headerSubtitle="View and manage your projects"
      onLogout={handleLogout}
    >
      {/* Search and Actions */}
      <div className="tt-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/dashboard?tab=projects')}
              className="flex items-center gap-2 tt-btn-primary"
            >
              <Plus className="h-5 w-5" />
              Create Project
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="tt-card border-[var(--danger)] text-[var(--danger)] p-4 mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--muted)]">Loading projects...</div>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && !error && (
        <>
          {filteredProjects.length === 0 ? (
            <div className="tt-card p-12 text-center">
              <FolderKanban className="h-16 w-16 text-[var(--muted)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="text-[var(--muted)] mb-6">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create your first project to get started'}
              </p>
              {user?.role === 'ADMIN' && !searchQuery && (
                <button
                  onClick={() => navigate('/dashboard?tab=projects')}
                  className="tt-btn-primary"
                >
                  Create Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="tt-card p-6 text-left hover:shadow-lg transition group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300">
                      <FolderKanban className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-[var(--muted)] group-hover:text-[var(--primary)] transition" />
                  </div>

                  <h3 className="text-lg font-semibold mb-2 truncate">
                    {project.name}
                  </h3>

                  {project.description && (
                    <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {project.key && (
                    <div className="inline-block px-3 py-1 rounded-full bg-[var(--bg-elevated)] text-xs font-medium text-[var(--muted)] mb-3">
                      {project.key}
                    </div>
                  )}

                  <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>
                      {project.createdAt
                        ? new Date(project.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </span>
                    {project._count && (
                      <span>{project._count.testCases || 0} test cases</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Summary */}
      {!loading && !error && filteredProjects.length > 0 && (
        <div className="mt-6 text-center text-sm text-[var(--muted)]">
          Showing {filteredProjects.length} of {projects.length} project
          {projects.length !== 1 ? 's' : ''}
        </div>
      )}
    </DashboardLayout>
  );
}
