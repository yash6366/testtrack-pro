import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Team Comparison Chart
 * Shows metrics comparison across team members
 */
export default function TeamComparisonChart({ data, metric = 'totalExecutions', title = 'Team Comparison', isLoading = false }) {
  if (isLoading) {
    return (
      <div className="tt-card p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="tt-card p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Transform data for display
  const displayData = data.map((item) => ({
    name: item.testerName || item.userName || 'Unknown',
    [metric]: item[metric] || 0,
  }));

  const getMetricLabel = () => {
    const labels = {
      totalExecutions: 'Total Executions',
      bugsReported: 'Bugs Reported',
      passRate: 'Pass Rate %',
      avgDurationMinutes: 'Avg Duration (min)',
      bugsResolved: 'Bugs Resolved',
      qualityScore: 'Quality Score',
    };
    return labels[metric] || metric;
  };

  return (
    <div className="tt-card p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={displayData} margin={{ top: 5, right: 30, left: 0, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis 
            dataKey="name" 
            stroke="var(--muted)" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
            }}
            labelStyle={{ color: 'var(--foreground)' }}
            label={{ value: getMetricLabel(), position: 'top' }}
          />
          <Bar
            dataKey={metric}
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            name={getMetricLabel()}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
