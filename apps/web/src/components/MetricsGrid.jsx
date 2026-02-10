export default function MetricsGrid({ metrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <div key={index} className="tt-card p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {metric.label}
              </p>
              <p className="text-3xl font-semibold mt-2">{metric.value}</p>
            </div>
            <div className={`rounded-2xl p-3 w-12 h-12 flex items-center justify-center ${metric.color}`}>
              <span className="h-2 w-2 rounded-full bg-current"></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
