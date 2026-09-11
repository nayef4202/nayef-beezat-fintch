import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getLatestAssessment, selectPortfolio } from "@/lib/beezat.functions";
import { useAuth } from "@/hooks/useAuth";
import { riskLevelLabel } from "@/lib/risk";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AssetAllocationChart } from "@/components/AssetAllocationChart";
import { toast } from "sonner";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "نتيجة استبيان مسارك الاستثماري | بيزات" },
      { name: "description", content: "مستوى مخاطرتك والمحفظة الإسلامية المقترحة لك في بيزات." },
      { property: "og:title", content: "نتيجة استبيان مسارك الاستثماري | بيزات" },
      { property: "og:description", content: "شوف مسارك الاستثماري والمحفظة المناسبة لك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fetchLatest = useServerFn(getLatestAssessment);
  const choose = useServerFn(selectPortfolio);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["latest-assessment", user?.id],
    queryFn: () => fetchLatest(),
    enabled: !!user,
  });

  const portfolioId = assessment?.recommended_portfolio_id ?? null;

  const { data: fetchedAllocations } = useQuery({
    queryKey: ["allocations", portfolioId],
    enabled: !!portfolioId && !(assessment as any)?.allocations?.length,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_allocations")
        .select("*")
        .eq("portfolio_id", portfolioId!)
        .order("target_weight", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  if (isLoading) return <main className="p-10 text-center">جاري التحميل...</main>;

  if (!assessment) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="mb-4">ما عندك نتيجة بعد.</p>
        <Button asChild>
          <Link to="/questionnaire">ابدأ الاستبيان</Link>
        </Button>
      </main>
    );
  }

  const model = assessment.model_portfolios as unknown as {
    id: string;
    name_ar: string;
    description_ar: string;
    expected_return: number;
    volatility: number;
  } | null;

  const allocations: Array<{
    id?: string;
    ticker: string;
    asset_name_ar: string;
    target_weight: number;
  }> = (assessment as any)?.allocations || fetchedAllocations || [];

  async function confirm() {
    setBusy(true);
    const targetId = model?.id || assessment?.recommended_portfolio_id || "moderate";
    try {
      await choose({ data: { portfolioId: targetId } });
    } catch (err) {
      console.warn("Could not choose portfolio explicitly:", err);
    } finally {
      setBusy(false);
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold">نتيجتك جاهزة</h1>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className="bz-panel rounded-lg p-4">
          <p className="text-xs text-muted-foreground">درجة المخاطرة</p>
          <p className="bz-metric mt-1 text-xl font-bold text-primary">{assessment.score}</p>
        </div>
        <div className="bz-panel rounded-lg p-4">
          <p className="text-xs text-muted-foreground">المستوى</p>
          <p className="mt-1 text-xl font-bold">{riskLevelLabel(assessment.risk_level)}</p>
        </div>
        <div className="bz-panel rounded-lg p-4">
          <p className="text-xs text-muted-foreground">العائد المتوقع سنوياً</p>
          <p className="bz-metric mt-1 text-xl font-bold text-primary">{Number(assessment.expected_return)}%</p>
          <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
            تقدير مبني على أداء تاريخي، وليس ربحاً مضموناً
          </p>
        </div>
      </div>

      {model && (
        <section className="bz-panel mt-8 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">{model.name_ar}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{model.description_ar}</p>

          {allocations && allocations.length > 0 && (
            <div className="mt-6">
              <AssetAllocationChart
                data={allocations.map((a) => ({
                  name: a.asset_name_ar,
                  value: Number(a.target_weight),
                }))}
              />
            </div>
          )}

          <ul className="mt-6 space-y-2 text-sm">
            {allocations?.map((a, idx) => (
              <li key={a.id || idx} className="flex justify-between border-b pb-2 last:border-0">
                <span>
                  {a.asset_name_ar} <span className="text-muted-foreground">({a.ticker})</span>
                </span>
                <span className="font-semibold">{Number(a.target_weight)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 rounded-xl border border-border/70 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
        تنويه: الأرقام المعروضة تقديرات مبنية على الأداء التاريخي لصناديق المؤشرات وليست أرباحاً
        مضمونة. قيمة الاستثمار قد ترتفع أو تنخفض، والأداء السابق لا يضمن الأداء المستقبلي.
      </p>

      <Button className="mt-4 w-full" onClick={confirm} disabled={busy}>
        {busy ? "جاري تجهيز محفظتك..." : "افتح محفظتك وشوف لوحة التحكم"}
      </Button>
    </main>
  );
}
