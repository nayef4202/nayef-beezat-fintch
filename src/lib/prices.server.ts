/** جلب أسعار الصناديق الحقيقية وتحديثها في قاعدة البيانات (خادم فقط) */

export type PriceRow = {
  ticker: string;
  market_symbol: string;
  currency: string;
  price: number;
  price_kwd: number;
  change_percent: number;
  usd_kwd: number;
  as_of: string | null;
  source: string;
  updated_at: string;
};

/** مدة صلاحية السعر قبل إعادة الجلب: 5 دقائق */
export const PRICE_TTL_MS = 5 * 60 * 1000;

type Quote = { price: number; changePercent: number; currency: string; asOf: string | null };

async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: { result?: Array<{ meta?: Record<string, unknown> }> };
    };
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = Number(meta["regularMarketPrice"]);
    if (!Number.isFinite(price) || price <= 0) return null;
    const t = Number(meta["regularMarketTime"]);
    return {
      price,
      changePercent: Number(meta["regularMarketChangePercent"]) || 0,
      currency: String(meta["currency"] ?? "USD"),
      asOf: Number.isFinite(t) ? new Date(t * 1000).toISOString() : null,
    };
  } catch {
    return null;
  }
}

/**
 * يتأكد أن الأسعار محدّثة (خلال آخر 15 دقيقة) ويرجع آخر الأسعار.
 * إذا تعذّر الجلب من المصدر يرجع آخر سعر محفوظ.
 */
export async function ensureFreshPrices(force = false): Promise<PriceRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: current, error } = await supabaseAdmin
    .from("asset_prices")
    .select("*")
    .order("ticker");
  if (error) throw new Error(error.message);
  const rows = (current ?? []) as unknown as PriceRow[];
  if (!rows.length) return [];

  const stale =
    force ||
    rows.some(
      (r) => Number(r.price) <= 0 || Date.now() - new Date(r.updated_at).getTime() > PRICE_TTL_MS,
    );
  if (!stale) return rows;

  // سعر صرف الدولار مقابل الدينار الكويتي
  const fx = await fetchQuote("KWD=X");
  const usdKwd = fx?.price && fx.price > 0 ? fx.price : Number(rows[0]?.usd_kwd) || 0.307;

  const quotes = await Promise.all(rows.map((r) => fetchQuote(r.market_symbol)));

  const updated: PriceRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const q = quotes[i];
    if (!q) {
      updated.push(row);
      continue;
    }
    const priceKwd = q.currency === "KWD" ? q.price : q.price * usdKwd;
    const next = {
      price: Number(q.price.toFixed(4)),
      price_kwd: Number(priceKwd.toFixed(6)),
      change_percent: Number(q.changePercent.toFixed(3)),
      currency: q.currency,
      usd_kwd: Number(usdKwd.toFixed(6)),
      as_of: q.asOf,
      source: "Yahoo Finance",
      updated_at: new Date().toISOString(),
    };
    const { error: uErr } = await supabaseAdmin
      .from("asset_prices")
      .update(next)
      .eq("ticker", row.ticker);
    if (uErr) throw new Error(uErr.message);
    updated.push({ ...row, ...next });
  }
  return updated;
}
