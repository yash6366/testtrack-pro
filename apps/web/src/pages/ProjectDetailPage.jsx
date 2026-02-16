import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks';
import DashboardLayout from '@/components/DashboardLayout';
import { apiClient } from '@/lib/apiClient';
import { 
  FileText, 
  Layers, 
  PlayCircle, 
  Bug,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadProjectData = async () => {
      try {
        setLoading(true);
        setError('');

        // Load project details
        const projectResponse = await apiClient.get(`/api/projects/${projectId}`);
        
        if (isMounted) {
          setProject(projectResponse.project || projectResponse);
          
          // Try to load project stats
          try {
            const statsResponse = await apiClient.get(`/api/projects/${projectId}/stats`);
            setStats(statsResponse.stats || statsResponse);
          } catch {
            // Stats are optional, continue without them
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load project');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProjectData();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Project"
        headerTitle="Loading..."
        headerSubtitle="Please wait"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--muted)]">Loading project details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout
        user={user}
        dashboardLabel="Project"
        headerTitle="Error"
        headerSubtitle="Failed to load project"
        onLogout={handleLogout}
      >
        <div className="tt-card p-6">
          <div className="text-[var(--danger)] mb-4">{error || 'Project not found'}</div>
          <button
            onClick={() => navigate('/dashboard')}
            className="tt-btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const projectStats = stats ? [
    { 
      label: 'Test Cases', 
      value: String(stats.testCases || 0), 
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
      icon: FileText,
    },
    { 
      label: 'Test Suites', 
      value: String(stats.testSuites || 0), 
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
      icon: Layers,
    },
    { 
      label: 'Test Runs', 
      value: String(stats.testRuns || 0), 
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
      icon: PlayCircle,
    },
    { 
      label: 'Bugs', 
      value: String(stats.bugs || 0), 
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
      icon: Bug,
    },
  ] : [];

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Project"
      headerTitle={project.name || 'Project Details'}
      headerSubtitle={project.description || 'Project overview and management'}
      onLogout={handleLogout}
    >
      {/* Project Information */}
      <div className="tt-card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Project Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-[var(--muted)]">Name:</span>
            <p className="font-medium">{project.name}</p>
          </div>
          {project.description && (
            <div>
              <span className="text-sm text-[var(--muted)]">Description:</span>
              <p className="font-medium">{project.description}</p>
            </div>
          )}
          {project.key && (
            <div>
              <span className="text-sm text-[var(--muted)]">Project Key:</span>
              <p className="font-medium">{project.key}</p>
            </div>
          )}
          {project.createdAt && (
            <div>
              <span className="text-sm text-[var(--muted)]">Created:</span>
              <p className="font-medium">{new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {projectStats.map((stat, index) => (
            <div key={index} className="tt-card p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--muted)]">{stat.label}</span>
                <stat.icon className="h-5 w-5 text-[var(--muted)]" />
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => navigate(`/projects/${projectId}/test-cases`)}
          className="tt-card p-6 text-left hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300 group-hover:bg-blue-500/20 transition">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Test Cases</h3>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Manage and organize test cases for this project
          </p>
        </button>

        <button
          onClick={() => navigate('/test-suites')}
          className="tt-card p-6 text-left hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 group-hover:bg-purple-500/20 transition">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Test Suites</h3>
          </div>
          <p className="text-sm text-[var(--muted)]">
            View and manage test suites
          </p>
        </button>

        <button
          onClick={() => navigate(`/projects/${projectId}/test-runs/create`)}
          className="tt-card p-6 text-left hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 group-hover:bg-emerald-500/20 transition">
              <PlayCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Create Test Run</h3>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Start a new test execution run
          </p>
        </button>

        <button
          onClick={() => navigate('/bugs')}
          className="tt-card p-6 text-left hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300 group-hover:bg-rose-500/20 transition">
              <Bug className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Bugs</h3>
          </div>
          <p className="text-sm text-[var(--muted)]">
            View and manage project bugs
          </p>
        </button>

        <button
          onClick={() => navigate(`/projects/${projectId}/analytics`)}
          className="tt-card p-6 text-left hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 group-hover:bg-indigo-500/20 transition">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Analytics</h3>
          </div>
          <p className="text-sm text-[var(--muted)]">
            View project analytics and metrics
          </p>
        </button>

        <button
          onClick={() => navigate(`/projects/${projectId}/milestones`)}
          className="tt-card p-6 text-left hover:shadow-lg transition group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300 group-hover:bg-amber-500/20 transition">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Milestones</h3>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Track project milestones and deadlines
          </p>
        </button>
      </div>
    </DashboardLayout>
  );
}
