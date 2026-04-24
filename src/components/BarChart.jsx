export default function BarChart({ items }) {
  const max = Math.max(...items.map((item) => item.amount), 1);

  return (
    <div className="bar-chart">
      {items.map((item) => (
        <div className="bar-chart-item" key={item.monthKey}>
          <div
            className={`bar-column ${item.isCurrent ? "is-current" : ""}`}
            style={{ height: `${Math.max((item.amount / max) * 100, item.amount ? 14 : 6)}%` }}
          />
          <strong>{item.amount ? Math.round(item.amount) : 0}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
