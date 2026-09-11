export type HoldingLike = {
  id: string;
  ticker: string;
  asset_name_ar: string;
  target_weight: number;
  value_kwd: number;
};

export type DriftRow = HoldingLike & {
  current_weight: number;
  drift: number;
  target_value: number;
  trade: number;
};

/** الحد المسموح لانحراف وزن أي أصل قبل تشغيل إعادة التوازن (نقطة مئوية) */
export const DRIFT_THRESHOLD = 3;

export function computeDrift(holdings: HoldingLike[]): {
  total: number;
  rows: DriftRow[];
  maxDrift: number;
  needsRebalance: boolean;
} {
  const total = holdings.reduce((s, h) => s + Number(h.value_kwd), 0);
  const rows: DriftRow[] = holdings.map((h) => {
    const value = Number(h.value_kwd);
    const target = Number(h.target_weight);
    const currentWeight = total > 0 ? (value / total) * 100 : 0;
    const targetValue = (total * target) / 100;
    return {
      ...h,
      value_kwd: value,
      target_weight: target,
      current_weight: Number(currentWeight.toFixed(2)),
      drift: Number((currentWeight - target).toFixed(2)),
      target_value: Number(targetValue.toFixed(3)),
      trade: Number((targetValue - value).toFixed(3)),
    };
  });
  const maxDrift = rows.reduce((m, r) => Math.max(m, Math.abs(r.drift)), 0);
  return { total, rows, maxDrift: Number(maxDrift.toFixed(2)), needsRebalance: maxDrift >= DRIFT_THRESHOLD };
}
