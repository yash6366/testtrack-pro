import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import DashboardLayout from '@/components/DashboardLayout';
import { apiClient } from '@/lib/apiClient';
import {
  Users,
  FolderKanban,
  Shield,
  Activity,
  FileText,
  Settings,
  ChevronRight,
} from 'lucide-react';

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadAdminData = async () => {
      try {
        setLoading(true);

        // Load admin overview stats
        const response = await apiClient.get('/api/admin/overview');

        if (isMounted && response.stats) {
          setStats(response.stats);
        }

        // Load recent activity (audit logs)
        try {
          const auditResponse = await apiClient.get('/api/admin/audit-logs?take=5');
          if (isMounted && auditResponse.logs) {
            setRecentActivity(auditResponse.logs);
          }
        } catch {
          // Recent activity is optional
        }
      } catch {
        // Handle error silently or show message
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAdminData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminCards = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
      stats: stats ? `${stats.totalUsers || 0} users` : 'Loading...',
      onClick: () => navigate('/dashboard?tab=users'),
    },
    {
      title: 'Project Management',
      description: 'View and manage all projects',
      icon: FolderKanban,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-300',
      stats: stats ? `${stats.totalProjects || 0} projects` : 'Loading...',
      onClick: () => navigate('/dashboard?tab=projects'),
    },
    {
      title: 'Audit Logs',
      description: 'View system activity and audit trail',
      icon: FileText,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
      stats: 'View logs',
      onClick: () => navigate('/dashboard?tab=audit'),
    },
    {
      title: 'System Health',
      description: 'Monitor system status and performance',
      icon: Activity,
      color: 'bg-orange-500/10 text-orange-600 dark:text-orange-300',
      stats: 'Check status',
      onClick: () => navigate('/health'),
    },
  ];

  const quickActions = [
    {
      label: 'Create New User',
      icon: Users,
      onClick: () => navigate('/dashboard?tab=users'),
    },
    {
      label: 'Create New Project',
      icon: FolderKanban,
      onClick: () => navigate('/dashboard?tab=projects'),
    },
    {
      label: 'System Settings',
      icon: Settings,
      onClick: () => navigate('/settings'),
    },
    {
      label: 'View All Logs',
      icon: Shield,
      onClick: () => navigate('/dashboard?tab=audit'),
    },
  ];

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Admin Panel"
      headerTitle="Administration"
      headerSubtitle="Manage system settings and users"
      onLogout={handleLogout}
    >
      {/* Statistics Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="tt-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--muted)]">Total Users</span>
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">
              {stats.totalUsers || 0}
            </p>
          </div>

          <div className="tt-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--muted)]">Active Users</span>
              <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">
              {stats.activeUsers || 0}
            </p>
          </div>

          <div className="tt-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--muted)]">Total Projects</span>
              <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-300" />
            </div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-300">
              {stats.totalProjects || 0}
            </p>
          </div>

          <div className="tt-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--muted)]">Admins</span>
              <Shield className="h-5 w-5 text-rose-600 dark:text-rose-300" />
            </div>
            <p className="text-3xl font-bold text-rose-600 dark:text-rose-300">
              {stats.roleDistribution?.admins || 0}
            </p>
          </div>
        </div>
      )}

      {/* Admin Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {adminCards.map((card, index) => (
          <button
            key={index}
            onClick={card.onClick}
            className="tt-card p-6 text-left hover:shadow-lg transition group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--muted)] group-hover:text-[var(--primary)] transition" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
            <p className="text-sm text-[var(--muted)] mb-3">{card.description}</p>
            <div className="text-sm font-medium text-[var(--primary)]">{card.stats}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="tt-card p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--bg-elevated)] transition text-left"
                >
                  <action.icon className="h-5 w-5 text-[var(--muted)]" />
                  <span className="text-sm">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="tt-card p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            {loading ? (
              <div className="text-center py-8 text-[var(--muted)]">Loading...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted)]">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 pb-4 border-b border-[var(--border)] last:border-0 last:pb-0"
                  >
                    <div className="p-2 rounded-lg bg-[var(--bg-elevated)]">
                      <Activity className="h-4 w-4 text-[var(--muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {activity.action || 'Action performed'}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        {activity.actor?.name || activity.actor?.email || 'User'} •{' '}
                        {activity.performedAt
                          ? new Date(activity.performedAt).toLocaleString()
                          : 'Recently'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
