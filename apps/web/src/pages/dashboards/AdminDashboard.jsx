import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks';
import DashboardLayout from '@/components/DashboardLayout';
import MetricsGrid from '@/components/MetricsGrid';
import ProjectManagement from '@/components/ProjectManagement';
import { apiClient } from '@/lib/apiClient';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const auditTake = 25;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (activeTab !== 'audit') {
      return undefined;
    }

    let isMounted = true;

    const loadAuditLogs = async () => {
      try {
        setAuditLoading(true);
        setAuditError('');

        const skip = (auditPage - 1) * auditTake;
        const response = await apiClient.get(
          `/api/admin/audit-logs?skip=${skip}&take=${auditTake}`
        );

        if (isMounted) {
          setAuditLogs(response.logs || []);
          setAuditTotal(response.pagination?.total || 0);
        }
      } catch (error) {
        if (isMounted) {
          setAuditError(error.message || 'Failed to load audit logs');
        }
      } finally {
        if (isMounted) {
          setAuditLoading(false);
        }
      }
    };

    loadAuditLogs();

    return () => {
      isMounted = false;
    };
  }, [activeTab, auditPage]);

  const formatActor = (log) => log.actor?.name || log.actor?.email || `User #${log.performedBy}`;

  const formatResource = (log) => {
    if (!log.resourceType) return 'System';
    if (log.resourceName) return `${log.resourceType} · ${log.resourceName}`;
    if (log.resourceId) return `${log.resourceType} #${log.resourceId}`;
    return log.resourceType;
  };

  const formatFrom = (log) => {
    const ip = log.ipAddress || 'Unknown IP';
    const ua = log.userAgent
      ? log.userAgent.length > 48
        ? `${log.userAgent.slice(0, 45)}...`
        : log.userAgent
      : 'Unknown agent';
    return `${ip} · ${ua}`;
  };

  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Developer', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Tester', status: 'Active' },
    { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'Developer', status: 'Inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Admin', status: 'Active' },
  ];

  const adminMetrics = [
    { label: 'Total Users', value: '156', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300' },
    { label: 'Active Sessions', value: '42', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
    { label: 'System Health', value: '99.8%', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300' },
    { label: 'API Calls/day', value: '2.4M', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  ];

  const systemStats = [
    { label: 'Servers', value: '12', detail: 'All operational' },
    { label: 'Database', value: 'PostgreSQL', detail: 'Healthy' },
    { label: 'Storage', value: '78%', detail: 'Usage capacity' },
    { label: 'Last Backup', value: '2 hours ago', detail: 'Automated' },
  ];

  const roleDistribution = [
    { role: 'Developer', count: 78, percentage: '50%' },
    { role: 'Tester', count: 62, percentage: '40%' },
    { role: 'Admin', count: 16, percentage: '10%' },
  ];

  return (
    <DashboardLayout
      user={user}
      dashboardLabel="Admin Dashboard"
      headerTitle="Admin Control Panel"
      headerSubtitle="Manage system, users, and monitor platform health"
      onLogout={handleLogout}
    >
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-[var(--border)] flex gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-6 py-3 font-medium border-b-2 transition ${
            activeTab === 'projects'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Project Management
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-medium border-b-2 transition ${
            activeTab === 'users'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-6 py-3 font-medium border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Audit & Security
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <MetricsGrid metrics={adminMetrics} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="tt-card p-6">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="space-y-4">
                {systemStats.map((stat, index) => (
                  <div key={index} className="flex justify-between items-center p-3 tt-card-soft">
                    <div>
                      <p className="text-sm text-[var(--muted)]">{stat.label}</p>
                      <p className="text-xs text-[var(--muted)]">{stat.detail}</p>
                    </div>
                    <p className="text-lg font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="tt-card p-6">
              <h3 className="text-lg font-semibold mb-4">User Distribution by Role</h3>
              <div className="space-y-4">
                {roleDistribution.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-[var(--muted-strong)]">{item.role}</span>
                      <span className="text-sm font-semibold">
                        {item.count} users ({item.percentage})
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-elevated)] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.role === 'Developer'
                            ? 'bg-blue-500'
                            : item.role === 'Tester'
                            ? 'bg-emerald-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: item.percentage }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="tt-card p-6">
              <h3 className="text-lg font-semibold mb-4">System Management</h3>
              <div className="space-y-3">
                <button className="tt-btn tt-btn-danger w-full py-2 text-sm">System Configuration</button>
                <button
                  className="tt-btn tt-btn-outline w-full py-2 text-sm"
                  onClick={() => setActiveTab('audit')}
                >
                  View Audit Logs
                </button>
                <button className="tt-btn tt-btn-outline w-full py-2 text-sm">Database Management</button>
              </div>
            </div>

            <div className="tt-card p-6">
              <h3 className="text-lg font-semibold mb-4">Admin Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Email:</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Role:</span>
                  <span className="bg-rose-500/10 text-rose-600 dark:text-rose-300 font-medium px-3 py-1 rounded-full">
                    Admin
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Status:</span>
                  <span className="text-[var(--success)] font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <ProjectManagement />
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="tt-card mb-8">
          <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-lg font-semibold">User Management</h3>
            <button className="tt-btn tt-btn-primary px-4 py-2 text-sm">Add User</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Name</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Email</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Role</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Status</th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-elevated)] transition">
                    <td className="px-6 py-4 text-sm font-medium">{u.name}</td>
                    <td className="px-6 py-4 text-sm text-[var(--muted)]">{u.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          u.role === 'Admin'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
                            : u.role === 'Developer'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          u.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-[var(--primary)] hover:text-[var(--primary-strong)] mr-3">Edit</button>
                      <button className="text-[var(--danger)] hover:opacity-80">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit & Security Tab */}
      {activeTab === 'audit' && (
        <div className="tt-card mb-8">
          <div className="px-6 py-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Audit Logs</h3>
              <p className="text-sm text-[var(--muted)]">Admin-only, immutable activity trail</p>
            </div>
            <div className="text-sm text-[var(--muted)]">
              Total: <span className="font-semibold text-[var(--foreground)]">{auditTotal}</span>
            </div>
          </div>

          {auditError && (
            <div className="px-6 py-4 text-sm text-[var(--danger)]">
              {auditError}
            </div>
          )}

          {auditLoading ? (
            <div className="px-6 py-8 flex items-center justify-center">
              <div className="animate-spin w-10 h-10 border-4 border-[var(--border)] border-t-blue-500 rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">When</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Who</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Action</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">What</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Details</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-[0.2em] text-[var(--muted)]">From</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {auditLogs.length === 0 && (
                    <tr>
                      <td className="px-6 py-6 text-sm text-[var(--muted)]" colSpan={6}>
                        No audit logs found.
                      </td>
                    </tr>
                  )}
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--bg-elevated)] transition">
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{formatActor(log)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted-strong)]">{formatResource(log)}</td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">{log.description}</td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]" title={log.userAgent || ''}>
                        {formatFrom(log)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
            <button
              className="tt-btn tt-btn-outline px-3 py-2 text-sm"
              onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
              disabled={auditPage === 1 || auditLoading}
            >
              Previous
            </button>
            <div className="text-sm text-[var(--muted)]">
              Page {auditPage} of {Math.max(1, Math.ceil(auditTotal / auditTake))}
            </div>
            <button
              className="tt-btn tt-btn-outline px-3 py-2 text-sm"
              onClick={() => setAuditPage((page) => page + 1)}
              disabled={auditPage * auditTake >= auditTotal || auditLoading}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
