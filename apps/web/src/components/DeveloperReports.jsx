import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks';
import {
  BarChart3,
  Download,
  TrendingUp,
  FileText,
  Calendar,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  Target,
} from 'lucide-react';

export default function DeveloperReports() {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [performanceReport, setPerformanceReport] = useState(null);
  const [bugAnalytics, setBugAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(dateRange));

      const [perfRes, analyticsRes] = await Promise.all([
        fetch(
          `/api/developer/reports/performance?startDate=${startDate.toISOString()}`,
          { headers: getAuthHeaders() }
        ),
        fetch(
          `/api/developer/reports/bug-analytics?startDate=${startDate.toISOString()}`,
          { headers: getAuthHeaders() }
        ),
      ]);

      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setPerformanceReport(perfData);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setBugAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportBugs = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/developer/reports/bugs/export', {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'developer-bugs.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting bugs:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPerformance = async () => {
    setExporting(true);
    try {
      const weeks = Math.ceil(Number(dateRange) / 7);
      const res = await fetch(
        `/api/developer/reports/performance/export?weeks=${weeks}`,
        { headers: getAuthHeaders() }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `developer-performance-${weeks}w.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting performance:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportAnalytics = async () => {
    setExporting(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(dateRange));

      const res = await fetch(
        `/api/developer/reports/bug-analytics/export?startDate=${startDate.toISOString()}`,
        { headers: getAuthHeaders() }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bug-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            Developer Reports & Analytics
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            View performance metrics and export detailed reports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Performance Metrics Cards */}
      {performanceReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Target className="h-5 w-5" />}
            label="Total Assigned"
            value={performanceReport.metrics.summary.totalAssigned}
            color="blue"
          />
          <MetricCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Resolved Bugs"
            value={performanceReport.metrics.summary.resolved}
            color="green"
            subtitle={`${performanceReport.metrics.summary.resolutionRate}% rate`}
          />
          <MetricCard
            icon={<Clock className="h-5 w-5" />}
            label="Avg Resolution Time"
            value={`${performanceReport.metrics.summary.avgResolutionTimeHours.toFixed(1)}h`}
            color="purple"
          />
          <MetricCard
            icon={<AlertCircle className="h-5 w-5" />}
            label="Reopened"
            value={performanceReport.metrics.summary.reopened}
            color="red"
            subtitle={`${performanceReport.metrics.summary.reopenRate}% rate`}
          />
        </div>
      )}

      {/* Export Actions */}
      <div className="tt-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Download className="h-5 w-5 text-indigo-500" />
          Export Reports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ExportButton
            label="Export Assigned Bugs"
            description="Download list of all assigned bugs"
            onClick={handleExportBugs}
            disabled={exporting}
            icon={<FileText className="h-4 w-4" />}
          />
          <ExportButton
            label="Export Performance Report"
            description="Detailed performance metrics"
            onClick={handleExportPerformance}
            disabled={exporting}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <ExportButton
            label="Export Bug Analytics"
            description="In-depth bug analysis"
            onClick={handleExportAnalytics}
            disabled={exporting}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Status Breakdown */}
      {performanceReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="tt-card p-6">
            <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
            <div className="space-y-3">
              {Object.entries(performanceReport.metrics.breakdown.byStatus).map(
                ([status, count]) => (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{status.toLowerCase().replace(/_/g, ' ')}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getStatusColor(status)}`}
                        style={{
                          width: `${
                            (count / performanceReport.metrics.summary.totalAssigned) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="tt-card p-6">
            <h3 className="text-lg font-semibold mb-4">Priority Distribution</h3>
            <div className="space-y-3">
              {Object.entries(performanceReport.metrics.breakdown.byPriority).map(
                ([priority, count]) => (
                  <div key={priority} className="flex justify-between items-center">
                    <span className="capitalize text-sm">{priority.toLowerCase()}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
                      {count}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bug Analytics */}
      {bugAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Trends */}
          <div className="tt-card p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Trends</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bugAnalytics.weeklyTrends.map((week) => (
                <div key={week.week} className="flex items-center gap-3 text-sm">
                  <span className="text-[var(--muted)] w-24">{week.week}</span>
                  <div className="flex-1 flex gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-blue-500">↑</span>
                      <span>{week.assigned} assigned</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-green-500">✓</span>
                      <span>{week.resolved} resolved</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Time Distribution */}
          <div className="tt-card p-6">
            <h3 className="text-lg font-semibold mb-4">Resolution Time Distribution</h3>
            <div className="space-y-3">
              {Object.entries(bugAnalytics.resolutionTimeAnalysis.buckets).map(
                ([bucket, count]) => (
                  <div key={bucket}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{bucket}</span>
                      <span className="font-medium">{count} bugs</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{
                          width: `${(count / bugAnalytics.totalBugs) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fix Quality Metrics */}
      {performanceReport && performanceReport.fixQuality && (
        <div className="tt-card p-6">
          <h3 className="text-lg font-semibold mb-4">Fix Quality Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold text-indigo-500">
                {performanceReport.fixQuality.documentationRate}%
              </div>
              <div className="text-sm text-[var(--muted)]">Documentation Rate</div>
              <p className="text-xs text-[var(--muted)] mt-1">
                Bugs with fix documentation
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-500">
                {performanceReport.fixQuality.avgFixHours}h
              </div>
              <div className="text-sm text-[var(--muted)]">Avg Fix Time</div>
              <p className="text-xs text-[var(--muted)] mt-1">
                Average hours to fix a bug
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Root Cause Categories</div>
              <div className="space-y-1">
                {Object.entries(performanceReport.fixQuality.rootCauseBreakdown || {})
                  .slice(0, 3)
                  .map(([category, count]) => (
                    <div key={category} className="flex justify-between text-xs">
                      <span className="text-[var(--muted)]">{category}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, color, subtitle }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    red: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="tt-card p-4">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-[var(--muted)]">{label}</div>
      {subtitle && <div className="text-xs text-[var(--muted)] mt-1">{subtitle}</div>}
    </div>
  );
}

function ExportButton({ label, description, onClick, disabled, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start p-4 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-2 mb-2 text-indigo-500">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
      <p className="text-xs text-[var(--muted)] text-left">{description}</p>
    </button>
  );
}

function getStatusColor(status) {
  const colors = {
    NEW: 'bg-blue-500',
    IN_PROGRESS: 'bg-yellow-500',
    FIXED: 'bg-green-500',
    AWAITING_VERIFICATION: 'bg-purple-500',
    VERIFIED_FIXED: 'bg-emerald-500',
    REOPENED: 'bg-red-500',
    CLOSED: 'bg-gray-500',
  };
  return colors[status] || 'bg-gray-500';
}

function getPriorityColor(priority) {
  const colors = {
    CRITICAL: 'bg-red-500/10 text-red-600 dark:text-red-400',
    HIGH: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    MEDIUM: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    LOW: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };
  return colors[priority] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
}
