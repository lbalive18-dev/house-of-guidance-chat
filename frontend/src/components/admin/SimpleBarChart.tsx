interface BarChartProps {
  data?: Array<{ date: string; count: number }>;
  label: string;
}

export default function SimpleBarChart({ data = [], label }: BarChartProps) {
  // If data is empty, return a placeholder
  if (!data || data.length === 0) {
    return (
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-sm text-gray-400">No data available</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="flex h-32 items-end gap-1">
        {data.map((point) => (
          <div key={point.date} className="group relative flex-1">
            <div
              className="w-full rounded-t-sm bg-primary-200 transition-colors group-hover:bg-primary dark:bg-primary-900/60 dark:group-hover:bg-primary-500"
              style={{ height: `${Math.max((point.count / max) * 100, point.count > 0 ? 4 : 1)}%` }}
            />
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {point.count}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>{new Date(data[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>
          {new Date(data[data.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
