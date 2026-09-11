import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyPortfolio, rebalanceNow, refreshAssetPrices } from "@/lib/beezat.functions";
import { useAuth } from "@/hooks/useAuth";
import { formatKwd } from "@/lib/risk";
import { DRIFT_THRESHOLD } from "@/lib/rebalance";

import { AssetAllocationChart } from "@/components/AssetAllocationChart";
import { RebalanceChart } from "@/components/RebalanceChart";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "محفظتي | بيزات" },
      { name: "description", content: "تابع أصول محفظتك الإسلامية وأوزانها وسجل إعادة التوازن الآلي." },
      { property: "og:title", content: "محفظتي | بيزات" },
      { property: "og:description", content: "أصول محفظتك وأوزانها وإعادة التوازن الآلي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const fetchPortfolio = useServerFn(getMyPortfolio);
  const rebalance = useServerFn(rebalanceNow);
  const refreshPrices = useServerFn(refreshAssetPrices);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["my-portfolio", user?.id],
    queryFn: () => fetchPortfolio(),
    enabled: !!user,
    // تحديث آلي كل 5 دقائق ما دامت الصفحة مفتوحة
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // إعادة التوازن الدورية الآلية (تشتغل تلقائياً إذا تجاوز الانحراف الحد)
  const [autoRebalance, setAutoRebalance] = useState(true);
  const [autoBusy, setAutoBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("beezat_auto_rebalance");
    if (saved !== null) setAutoRebalance(saved === "1");
  }, []);

  const needsRebalance = !!data?.drift?.needsRebalance;
  useEffect(() => {
    if (!autoRebalance || !needsRebalance || autoBusy) return;
    let cancelled = false;
    (async () => {
      setAutoBusy(true);
      try {
        const res = await rebalance();
        if (!cancelled && res.rebalanced) {
          await qc.invalidateQueries({ queryKey: ["my-portfolio", user?.id] });
          toast.success("إعادة توازن آلية: رجّعنا أوزان محفظتك لنسبها المستهدفة");
        }
      } catch {
        /* نتجاهل الخطأ هنا، يقدر المستخدم يضغط الزر يدوياً */
      } finally {
        if (!cancelled) setAutoBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRebalance, needsRebalance]);

  function toggleAuto() {
    setAutoRebalance((v) => {
      const next = !v;
      localStorage.setItem("beezat_auto_rebalance", next ? "1" : "0");
      return next;
    });
  }

  if (isLoading) return <main className="p-10 text-center">جاري التحميل...</main>;

  if (!data) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="mb-4">ما عندك محفظة بعد. جاوب على الاستبيان أول.</p>
        <Button asChild>
          <Link to="/questionnaire">ابدأ الاستبيان</Link>
        </Button>
      </main>
    );
  }

  const model = (data.userPortfolio?.model_portfolios ?? { name_ar: "محفظتي", expected_return: 0 }) as unknown as {
    name_ar: string;
    expected_return: number;
  };
  const prices = data.prices ?? [];
  const events = data.events ?? [];
  const drift = data.drift ?? { total: 0, maxDrift: 0, rows: [] };
  const rows = drift.rows ?? [];
  const pnl = drift.total - Number(data.invested);
  const pnlPct = Number(data.invested) > 0 ? (pnl / Number(data.invested)) * 100 : 0;
  const latestAsOf = prices
    .map((p) => p.as_of)
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  const lastUpdate = latestAsOf ? new Date(latestAsOf).toLocaleString("en-GB") : "";

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["my-portfolio", user?.id] });
  }

  async function handleRefreshPrices() {
    try {
      await refreshPrices();
      await refresh();
      toast.success("تم جلب آخر أسعار الصناديق من السوق");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "صار خطأ");
    }
  }

  async function handleRebalance() {
    try {
      const res = await rebalance();
      await refresh();
      toast.success(
        res.rebalanced
          ? "تمت إعادة توازن محفظتك"
          : `الانحراف ${res.maxDrift}% أقل من الحد، ما تحتاج إعادة توازن`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "صار خطأ");
    }
  }


  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">{model.name_ar}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        العائد المتوقع سنوياً {Number(model.expected_return)}%{" "}
        <span className="text-xs">(تقدير تاريخي وليس ربحاً مضموناً)</span>
      </p>


      <div className="bz-panel bz-surface mt-6 rounded-xl p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <span>🎁</span> رصيد تجريبي مجاني (1,500 د.ك)
          </span>
          <span className="text-xs text-muted-foreground">استثمار تجريبي بأحدث أسعار السوق الحقيقية</span>
        </div>
        <p className="text-xs text-muted-foreground">القيمة الحالية بأسعار السوق</p>
        <p className="bz-metric mt-1 text-3xl font-bold sm:text-4xl">{formatKwd(drift.total)}</p>
        <p className="mt-1 text-sm">
          <span className="text-muted-foreground">المبلغ المستثمر {formatKwd(data.invested)} · </span>
          <span className={pnl >= 0 ? "text-primary" : "text-destructive"}>
            {pnl >= 0 ? "+" : "-"}
            {formatKwd(Math.abs(pnl))} ({pnlPct >= 0 ? "+" : ""}
            {pnlPct.toFixed(2)}%)
          </span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          أعلى انحراف عن الوزن المستهدف: {drift.maxDrift}% (الحد المسموح {DRIFT_THRESHOLD}%)
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 [&>button]:w-full">
        <Button onClick={handleRebalance} disabled={autoBusy}>
          {autoBusy ? "جاري إعادة التوازن..." : "إعادة التوازن الآن"}
        </Button>
        <Button variant="outline" onClick={handleRefreshPrices} disabled={isFetching}>
          {isFetching ? "جاري التحديث..." : "تحديث الأسعار الآن"}
        </Button>
      </div>
      <Button asChild variant="ghost" className="mt-3 w-full">
        <Link to="/accounts" search={{ payment: "", paymentId: "" }}>الإيداع والسحب وسجل الصفقات</Link>
      </Button>

      <div className="bz-panel mt-4 flex items-center justify-between gap-4 rounded-lg p-4">
        <div>
          <p className="text-sm font-medium">إعادة التوازن الدورية الآلية</p>
          <p className="mt-1 text-xs text-muted-foreground">
            نفحص محفظتك مع كل تحديث للأسعار (كل 5 دقائق) ونرجّع الأوزان تلقائياً إذا تعدّى الانحراف{" "}
            {DRIFT_THRESHOLD}%.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={autoRebalance ? "default" : "outline"}
          onClick={toggleAuto}
          aria-pressed={autoRebalance}
          className="shrink-0"
        >
          {autoRebalance ? "مفعّلة" : "متوقفة"}
        </Button>
      </div>

      <section className="bz-panel mt-8 rounded-lg p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">أسعار الصناديق الحقيقية</h2>
          <span className="text-xs text-muted-foreground">
            المصدر: {prices[0]?.source ?? "Yahoo Finance"}
            {lastUpdate ? ` · ${lastUpdate}` : ""}
          </span>
        </div>
        <ul className="divide-y text-sm">
          {prices.map((p) => (
            <li key={p.ticker} className="flex items-center justify-between gap-2 py-2">
              <span className="font-medium">{p.ticker}</span>
              <span className="flex flex-col items-end gap-0.5 text-left">
                <span className="text-muted-foreground text-xs">
                  {Number(p.price).toFixed(2)} {p.currency} · {formatKwd(Number(p.price_kwd))}
                </span>
                <span
                  className={
                    Number(p.change_percent) >= 0 ? "text-primary text-xs" : "text-destructive text-xs"
                  }
                >
                  {Number(p.change_percent) >= 0 ? "+" : ""}
                  {Number(p.change_percent).toFixed(2)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          تتحدث الأسعار آلياً كل 5 دقائق وسعر صرف الدولار مقابل الدينار من نفس المصدر.
        </p>
      </section>


      <section className="bz-panel mt-8 rounded-lg p-5">
        <h2 className="mb-1 font-semibold">كيف تشتغل خوارزمية إعادة التوازن؟</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          مقارنة بين الوزن المستهدف لكل أصل ووزنه الحالي بعد تحرّك أسعار السوق.
        </p>
        <RebalanceChart
          rows={rows.map((h) => ({
            name: h.asset_name_ar,
            target: Number(h.target_weight),
            current: Number(h.current_weight),
          }))}
          threshold={DRIFT_THRESHOLD}
        />
      </section>

      <section className="bz-panel mt-8 rounded-lg p-5">
        <h2 className="mb-1 font-semibold">توزيع الأصول</h2>
        <AssetAllocationChart
          data={rows.map((h) => ({ name: h.asset_name_ar, value: Number(h.current_weight) }))}
        />
      </section>


      <section className="mt-8">
        <h2 className="mb-3 font-semibold">أصول المحفظة</h2>
        <ul className="space-y-2">
          {rows.map((h) => (
            <li key={h.id} className="bz-panel rounded-lg p-4 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">
                  {h.asset_name_ar} <span className="text-muted-foreground">({h.ticker})</span>
                </span>
                <span>{formatKwd(h.value_kwd)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {Number((h as { units?: number }).units ?? 0).toFixed(4)} وحدة × سعر السوق
              </div>
              <div className="mt-1 flex justify-between text-muted-foreground">
                <span>
                  الوزن الحالي {h.current_weight}% / المستهدف {h.target_weight}%
                </span>
                <span className={Math.abs(h.drift) >= DRIFT_THRESHOLD ? "text-destructive" : ""}>
                  {h.drift > 0 ? "+" : ""}
                  {h.drift}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {events.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">سجل إعادة التوازن</h2>
          <ul className="space-y-2 text-sm">
            {events.map((e) => {
              const trades = (Array.isArray(e.trades) ? e.trades : []) as Array<{
                ticker?: string;
                name?: string;
                drift?: number;
                trade?: number;
              }>;
              return (
                <li key={e.id} className="bz-panel rounded-lg p-4">
                  <div className="flex justify-between">
                    <span>{new Date(e.created_at).toLocaleString("en-GB")}</span>
                    <span className="text-muted-foreground">أعلى انحراف {Number(e.max_drift)}%</span>
                  </div>
                  {trades.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {trades.map((t, i) => {
                        const amount = Number(t.trade ?? 0);
                        return (
                          <li key={`${e.id}-${i}`} className="flex justify-between">
                            <span className="text-muted-foreground">
                              {t.name ?? t.ticker} ({t.ticker})
                            </span>
                            <span className={amount >= 0 ? "text-primary" : "text-destructive"}>
                              {amount >= 0 ? "شراء" : "بيع"} {formatKwd(Math.abs(amount))}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="mt-10 text-xs text-muted-foreground">
        الأسعار حقيقية من {prices[0]?.source ?? "Yahoo Finance"} وقد تتأخر قليلاً. الإيداعات
        تعتمد بعد تأكيد مزود الدفع، وطلبات السحب تخضع للمراجعة والتحويل البنكي.
      </p>
    </main>
  );
}
