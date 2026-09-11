type AllocationItem = {
  name: string;
  value: number;
};

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--muted-foreground)",
];

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export function AssetAllocationChart({ data }: { data: AllocationItem[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const size = 192;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;
  let currentAngle = 0;

  const slices = data.map((item, index) => {
    const sliceAngle = total > 0 ? (item.value / total) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;
    return {
      ...item,
      path: describeArc(cx, cy, radius, startAngle, endAngle),
      color: COLORS[index % COLORS.length],
    };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.path}
            fill={slice.color}
            stroke="var(--card)"
            strokeWidth={2}
          />
        ))}
        <circle cx={cx} cy={cy} r={radius * 0.55} fill="var(--color-card)" />
      </svg>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
        {slices.map((slice, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="text-muted-foreground">{slice.name}</span>
            <span className="font-medium">{slice.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
