import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Bug Distribution Pie Chart
 * Shows distribution by priority or severity
 */
export default function BugDistributionChart({ data, title = 'Bug Distribution', isLoading = false }) {
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

  const COLORS = {
    critical: '#ef4444',
    major: '#f59e0b',
    minor: '#3b82f6',
    trivial: '#8b5cf6',
    p0: '#dc2626',
    p1: '#ea580c',
    p2: '#3b82f6',
    p3: '#0ea5e9',
  };

  const getColor = (name) => {
    const lower = name.toLowerCase();
    return COLORS[lower] || '#6b7280';
  };

  return (
    <div className="tt-card p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
            }}
            labelStyle={{ color: 'var(--foreground)' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
