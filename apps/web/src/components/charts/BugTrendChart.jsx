import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Bug Trend Chart
 * Shows bug creation vs resolution over time
 */
export default function BugTrendChart({ data, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="tt-card p-6">
        <h3 className="text-lg font-semibold mb-4">Bug Trend Analysis</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="tt-card p-6">
        <h3 className="text-lg font-semibold mb-4">Bug Trend Analysis</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="tt-card p-6">
      <h3 className="text-lg font-semibold mb-4">Bug Trend Analysis</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis 
            dataKey="week" 
            stroke="var(--muted)" 
            tick={{ fontSize: 12 }}
          />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
            }}
            labelStyle={{ color: 'var(--foreground)' }}
          />
          <Legend />
          <Bar
            dataKey="created"
            fill="#ef4444"
            name="Created"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="resolved"
            fill="#10b981"
            name="Resolved"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="reopened"
            fill="#f59e0b"
            name="Reopened"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
