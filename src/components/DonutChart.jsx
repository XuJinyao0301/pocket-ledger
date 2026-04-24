export default function DonutChart({ items, total, size = 220 }) {
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * 2 * radius;
  let offsetCursor = 0;

  return (
    <div className="donut-chart" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="donut-track"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {items.map((item) => {
          const ratio = total > 0 ? item.amount / total : 0;
          const dash = ratio * circumference;
          const currentOffset = offsetCursor;
          offsetCursor += dash;

          return (
            <circle
              key={item.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </svg>
      <div className="donut-center">
        <span>总支出</span>
        <strong>{Number(total || 0).toFixed(0)}</strong>
      </div>
    </div>
  );
}
