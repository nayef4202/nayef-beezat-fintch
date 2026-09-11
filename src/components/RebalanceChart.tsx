type RebalanceRow = {
  name: string;
  target: number;
  current: number;
};

export function RebalanceChart({
  rows,
  threshold,
}: {
  rows: RebalanceRow[];
  threshold: number;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.target, r.current]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-0.5 bg-muted-foreground" />
          الوزن المستهدف
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-full bg-primary" />
          الوزن الحالي
        </span>
        <span>حد الانحراف المسموح {threshold}%</span>

      </div>

      <ul className="space-y-3">
        {rows.map((row) => {
          const drift = Number((row.current - row.target).toFixed(2));
          const over = Math.abs(drift) >= threshold;
          return (
            <li key={row.name} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">{row.name}</span>
                <span className="bz-metric text-muted-foreground">
                  {row.target}% ← {row.current}%{" "}
                  <span className={over ? "text-destructive" : "text-primary"}>
                    ({drift > 0 ? "+" : ""}
                    {drift})
                  </span>
                </span>
              </div>
              <div className="relative h-4 overflow-hidden rounded-full bg-muted/30">
                <div
                  className={`absolute inset-y-0 rounded-full ${over ? "bg-destructive/80" : "bg-primary"}`}
                  style={{ insetInlineStart: 0, width: `${(row.current / max) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 w-0.5 bg-foreground"
                  style={{ insetInlineStart: `calc(${(row.target / max) * 100}% - 1px)` }}
                />
              </div>

            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        الشريط الملوّن هو الوزن الحالي والخط العمودي هو الوزن المستهدف. إذا صار الفرق بينهما{" "}
        {threshold} نقاط مئوية أو أكثر، تبيع الخوارزمية من الأصل الزائد وتشتري من الناقص حتى ترجع
        المحفظة لأوزانها المستهدفة.
      </p>

    </div>
  );
}
