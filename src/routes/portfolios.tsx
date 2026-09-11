import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getModelPortfolios } from "@/lib/beezat.functions";
import { riskLevelLabel } from "@/lib/risk";
import { AssetAllocationChart } from "@/components/AssetAllocationChart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portfolios")({
  head: () => ({
    meta: [
      { title: "المحافظ الإسلامية | بيزات" },
      { name: "description", content: "تعرّف على أربع محافظ استثمارية إسلامية جاهزة في بيزات، من المحافظة إلى النمو العالي." },
      { property: "og:title", content: "المحافظ الإسلامية | بيزات" },
      { property: "og:description", content: "محافظ إسلامية جاهزة تناسب مستوى مخاطرتك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfoliosPage,
});

function PortfoliosPage() {
  const fetchPortfolios = useServerFn(getModelPortfolios);
  const { data, isLoading } = useQuery({
    queryKey: ["model-portfolios"],
    queryFn: () => fetchPortfolios(),
  });

  if (isLoading) return <main className="p-10 text-center">جاري التحميل...</main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">المحافظ الإسلامية الجاهزة</h1>
      <p className="mt-2 text-muted-foreground">
        أربع محافظ متوافقة مع الشريعة، كل محفظة مبنية من صناديق مؤشرات عالمية وموزعة حسب مستوى المخاطرة.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {data?.map((portfolio) => {
          const chartData = portfolio.allocations.map((a) => ({
            name: a.asset_name_ar,
            value: Number(a.target_weight),
          }));

          return (
            <article key={portfolio.id} className="bz-panel rounded-lg p-5 transition-colors hover:border-primary/35">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{portfolio.name_ar}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{portfolio.description_ar}</p>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {riskLevelLabel(portfolio.risk_level)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">العائد المتوقع سنوياً</p>
                  <p className="bz-metric mt-1 text-xl font-bold text-primary">{Number(portfolio.expected_return)}%</p>
                  <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
                    تقدير تاريخي وليس ربحاً مضموناً
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">التذبذب التقديري</p>
                  <p className="bz-metric mt-1 text-xl font-bold">{Number(portfolio.volatility)}%</p>
                </div>
              </div>


              <div className="mt-5">
                <AssetAllocationChart data={chartData} />
              </div>

              <ul className="mt-4 space-y-2 text-sm">
                {portfolio.allocations.map((a) => (
                  <li key={a.id} className="flex justify-between border-b pb-2 last:border-0">
                    <span>
                      {a.asset_name_ar}{" "}
                      <span className="text-muted-foreground">({a.ticker})</span>
                    </span>
                    <span className="font-semibold">{Number(a.target_weight)}%</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <p className="mt-10 rounded-xl border border-border/70 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
        تنويه: العوائد والتذبذب المعروضة تقديرات مبنية على الأداء التاريخي لصناديق المؤشرات وليست
        أرباحاً مضمونة. قيمة الاستثمار قد ترتفع أو تنخفض، والأداء السابق لا يضمن الأداء المستقبلي.
      </p>

      <div className="mt-8 flex justify-center">
        <Button asChild size="lg">
          <Link to="/questionnaire">اختار المحفظة المناسبة لك</Link>
        </Button>
      </div>

    </main>
  );
}
