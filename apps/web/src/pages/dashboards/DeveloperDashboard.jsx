import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import DashboardLayout from '@/components/DashboardLayout';
import MetricsGrid from '@/components/MetricsGrid';

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const deployments = [
    {
      id: 1,
      name: 'Auth Service v1.2.0',
      status: 'Live',
      date: '2024-02-05',
      environment: 'Production',
    },
    {
      id: 2,
      name: 'Email Verification Service',
      status: 'Live',
      date: '2024-02-04',
      environment: 'Production',
    },
    {
      id: 3,
      name: 'Dashboard API v2.0',
      status: 'Staging',
      date: '2024-02-03',
      environment: 'Staging',
    },
  ];

  const devMetrics = [
    { label: 'Active Services', value: '8', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300' },
    { label: 'API Endpoints', value: '24', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
    { label: 'Uptime', value: '99.8%', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300' },
    { label: 'Response Time', value: '120ms', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-300' },
  ];

  const gitRepositories = [
    { name: 'testtrack-api', branch: 'main', commits: '234' },
    { name: 'testtrack-web', branch: 'develop', commits: '189' },
    { name: 'testtrack-shared', branch: 'main', commits: '56' },
  ];

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Developer Dashboard"
      headerTitle={`Welcome, ${user.name}!`}
      headerSubtitle="Monitor your services and deployments"
      onLogout={handleLogout}
    >
      <MetricsGrid metrics={devMetrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold">Recent Deployments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Service</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Status</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {deployments.map((deployment) => (
                  <tr key={deployment.id} className="hover:bg-[var(--bg-elevated)] transition">
                    <td className="px-6 py-4 text-sm font-medium">{deployment.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          deployment.status === 'Live'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
                        }`}
                      >
                        {deployment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--muted)]">{deployment.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="tt-card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold">Git Repositories</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {gitRepositories.map((repo, index) => (
              <div key={index} className="px-6 py-4 hover:bg-[var(--bg-elevated)] transition">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">{repo.name}</h4>
                  <span className="text-xs bg-[var(--bg-elevated)] text-[var(--muted-strong)] px-2 py-1 rounded-full border border-[var(--border)]">
                    {repo.branch}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">{repo.commits} commits</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="tt-card p-6">
          <h3 className="text-lg font-semibold mb-4">Development Tools</h3>
          <div className="space-y-3">
            <button className="tt-btn tt-btn-primary w-full py-2 text-sm">Deploy Service</button>
            <button className="tt-btn tt-btn-outline w-full py-2 text-sm">View Logs</button>
            <button className="tt-btn tt-btn-outline w-full py-2 text-sm">Check APIs</button>
          </div>
        </div>

        <div className="tt-card p-6">
          <h3 className="text-lg font-semibold mb-4">Developer Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Email:</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Role:</span>
              <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-medium px-3 py-1 rounded-full">
                Developer
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Status:</span>
              <span className="text-[var(--success)] font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
