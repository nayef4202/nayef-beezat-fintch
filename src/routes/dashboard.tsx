import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyPortfolio, rebalanceNow } from "@/lib/beezat.functions";
import { useAuth } from "@/hooks/useAuth";
import { formatKwd } from "@/lib/risk";
import { DRIFT_THRESHOLD } from "@/lib/rebalance";
import { AssetAllocationChart } from "@/components/AssetAllocationChart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | بيزات" },
      { name: "description", content: "نظرة سريعة على قيمة محفظتك وأرباحك وإعادة التوازن بضغطة زر." },
      { property: "og:title", content: "لوحة التحكم | بيزات" },
      { property: "og:description", content: "قيمة محفظتك وأرباحك وإعادة التوازن الآلي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const fetchPortfolio = useServerFn(getMyPortfolio);
  const rebalance = useServerFn(rebalanceNow);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["my-portfolio", user?.id],
    queryFn: () => fetchPortfolio(),
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) return <main className="p-10 text-center">جاري التحميل...</main>;

  if (!data) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="mt-4 mb-6 text-muted-foreground">ما عندك محفظة بعد. جاوب على الاستبيان أول.</p>
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
  const drift = data.drift ?? { total: 0, maxDrift: 0, rows: [] };
  const rows = drift.rows ?? [];
  const invested = Number(data.invested);
  const pnl = drift.total - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

  async function handleRebalance() {
    setBusy(true);
    try {
      const res = await rebalance();
      await qc.invalidateQueries({ queryKey: ["my-portfolio", user?.id] });
      toast.success(
        res.rebalanced
          ? "تمت إعادة توازن محفظتك"
          : `الانحراف ${res.maxDrift}% أقل من الحد، ما تحتاج إعادة توازن`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "صار خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <p className="text-sm text-muted-foreground">أهلاً فيك 👋</p>
      <h1 className="mt-1 text-2xl font-bold">{model.name_ar}</h1>

      <section className="bz-panel bz-surface mt-6 rounded-2xl p-6 text-center">
        <p className="text-xs text-muted-foreground">قيمة المحفظة الحالية</p>
        <p className="bz-metric mt-2 text-4xl font-bold">{formatKwd(drift.total)}</p>
        <p className={`mt-2 text-lg font-semibold ${pnl >= 0 ? "text-primary" : "text-destructive"}`}>
          {pnl >= 0 ? "+" : "-"}
          {formatKwd(Math.abs(pnl))} ({pnlPct >= 0 ? "+" : ""}
          {pnlPct.toFixed(2)}%)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">المبلغ المستثمر: {formatKwd(invested)}</p>
      </section>

      <Button className="mt-4 w-full" onClick={handleRebalance} disabled={busy || isFetching}>
        {busy ? "جاري إعادة التوازن..." : "إعادة التوازن"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        أعلى انحراف حالياً {drift.maxDrift}% — نعيد التوازن تلقائياً إذا تجاوز {DRIFT_THRESHOLD}%
      </p>

      {rows.length > 0 && (
        <section className="bz-panel mt-6 rounded-2xl p-5">
          <h2 className="mb-2 font-semibold">توزيع محفظتك</h2>
          <AssetAllocationChart
            data={rows.map((h) => ({ name: h.asset_name_ar, value: Number(h.current_weight) }))}
          />
        </section>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 [&>a]:w-full">
        <Button asChild variant="outline">
          <Link to="/accounts" search={{ payment: "", paymentId: "" }}>إيداع / سحب</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/portfolio">التفاصيل الكاملة</Link>
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        العائد المتوقع {Number(model.expected_return)}% سنوياً — تقدير تاريخي وليس ربحاً مضموناً.
      </p>
    </main>
  );
}
