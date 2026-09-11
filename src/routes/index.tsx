import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { BeezatLogo } from "@/components/BeezatLogo";
import { formatKwd } from "@/lib/risk";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "بيزات | استثمار آلي إسلامي في الكويت" },
      {
        name: "description",
        content:
          "بيزات منصة كويتية تدير محفظتك الاستثمارية آلياً في صناديق مؤشرات عالمية متوافقة مع الشريعة، برسوم منخفضة وبدون تعقيد.",
      },
      { property: "og:title", content: "بيزات | استثمار آلي إسلامي في الكويت" },
      {
        property: "og:description",
        content: "استبيان مخاطر بسيط، محفظة إسلامية جاهزة، وإعادة توازن آلية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CALC_PORTFOLIOS = [
  { code: "conservative", name: "المحافظة", annual: 4.5, vol: 4 },
  { code: "moderate", name: "المتوازنة", annual: 6.5, vol: 8 },
  { code: "growth", name: "النمو", annual: 8.5, vol: 13 },
  { code: "aggressive", name: "النمو العالي", annual: 10.5, vol: 18 },
] as const;

function compoundFutureValue(monthly: number, years: number, annualPct: number): number {
  const months = years * 12;
  const monthlyRate = annualPct / 100 / 12;
  if (monthlyRate === 0) return monthly * months;
  return monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
}


function Index() {
  const { user } = useAuth();

  return (
    <main>
      <section className="bz-surface border-b border-border/70">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:py-16 lg:grid-cols-[1fr_auto]">
          <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="size-1.5 rounded-full bg-accent" />
            منصة كويتية • متوافقة مع الشريعة
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
            استثمار ذكي.
            <br />
            <span className="text-primary">ينمو معك آلياً.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            جاوب على أسئلة بسيطة، ونحدد لك محفظة استثمارية إسلامية جاهزة في صناديق مؤشرات عالمية،
            ونعيد ضبط أوزانها آلياً كل ما تحركت الأسواق — بدون خبرة مالية وبدون تدخل بشري.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to={user ? "/questionnaire" : "/auth"}>ابدأ استبيان مسارك الاستثماري</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/portfolios">شوف المحافظ</Link>
            </Button>
            {user && (
              <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
                <Link to="/accounts" search={{ payment: "", paymentId: "" }}>حساباتي</Link>
              </Button>
            )}
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-3 text-center">
            {[
              { k: "4", v: "محافظ جاهزة" },
              { k: "%0.5", v: "رسوم سنوية" },
              { k: "%100", v: "متوافقة شرعاً" },
            ].map((s) => (
              <div key={s.v} className="bz-panel rounded-lg p-3">
                <dt className="bz-metric text-lg font-bold text-primary sm:text-2xl">{s.k}</dt>
                <dd className="mt-1 text-[11px] text-muted-foreground sm:text-sm">{s.v}</dd>
              </div>
            ))}
          </dl>
          </div>
          <div className="hidden min-w-80 justify-center lg:flex">
            <BeezatLogo />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-bold sm:text-2xl">كيف تشتغل بيزات؟</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "استبيان مسارك الاستثماري",
              d: "أسئلة بسيطة بلهجتنا تحدد مستوى تحملك للمخاطرة والعائد المتوقع.",
            },
            {
              n: "2",
              t: "محافظ جاهزة",
              d: "أربع محافظ إسلامية من المحافظة إلى النمو العالي.",
            },
            {
              n: "3",
              t: "إعادة توازن آلية",
              d: "نرجّع أوزان محفظتك لنسبها الأصلية عند انحراف الأسعار.",
            },
          ].map((c) => (
            <li key={c.t} className="bz-panel rounded-lg p-5">
              <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                {c.n}
              </span>
              <h3 className="mt-3 font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{c.d}</p>
            </li>
          ))}
        </ul>

        <CompoundCalculator />

        <div className="bz-panel mt-10 rounded-lg p-5 sm:p-6">
          <h2 className="text-lg font-bold">مثال بسيط: كيف ترجّع الخوارزمية محفظتك للهدف؟</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            خلّ هدفك للأسهم 45% من المحفظة — شوف شيصير بالسوق وكيف نتصرف آلياً:
          </p>

          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "الهدف",
                value: 45,
                label: "45%",
                desc: "حددنا إن الأسهم لازم تكون 45% من محفظتك.",
                tone: "target",
              },
              {
                step: "2",
                title: "السوق تحرّك",
                value: 51,
                label: "51%",
                desc: "ارتفعت أسعار الأسهم، فصارت حصتها 51% — زيادة عن الحد المسموح.",
                tone: "over",
              },
              {
                step: "3",
                title: "إعادة التوازن",
                value: 45,
                label: "45%",
                desc: "بعنا الزيادة تلقائياً واشترينا في الأصول الناقصة، ورجعت المحفظة للهدف.",
                tone: "fixed",
              },
            ].map((s) => (
              <li key={s.step} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {s.step}
                  </span>
                  <span className="text-sm font-semibold">{s.title}</span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="relative h-8 flex-1 overflow-hidden rounded-full bg-muted/30">
                    <div
                      className={`absolute inset-y-0 rounded-full ${
                        s.tone === "over"
                          ? "bg-destructive/80"
                          : s.tone === "fixed"
                            ? "bg-primary"
                            : "bg-primary/50"
                      }`}
                      style={{ insetInlineStart: 0, width: `${(s.value / 60) * 100}%` }}
                    />
                    <div
                      className="absolute inset-y-0 w-0.5 bg-foreground/80"
                      style={{ insetInlineStart: `calc(${(45 / 60) * 100}% - 1px)` }}
                    />
                  </div>
                  <span
                    className={`bz-metric w-12 text-lg font-bold ${
                      s.tone === "over" ? "text-destructive" : "text-primary"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-6 text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>

          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            الخط العمودي يمثل هدفك (45%). كل ما ابتعد الوزن الحالي عن الهدف بـ 3 نقاط مئوية أو أكثر،
            تتدخل الخوارزمية وتعيد المحفظة لتوازنها — بدون ما تسوي شي.
          </p>
        </div>

        <div className="bz-panel mt-10 rounded-lg p-5 sm:p-6">
          <h2 className="text-lg font-bold">ليش بيزات؟</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-7 text-muted-foreground sm:grid-cols-3">
            <li>رسوم منخفضة وواضحة بدون مفاجآت.</li>
            <li>إيداع وسحب سهل وسريع بالدينار الكويتي.</li>
            <li>صناديق مؤشرات عالمية مفلترة شرعاً.</li>
          </ul>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          تنويه: العوائد المعروضة في المحافظ تقديرات مبنية على أداء تاريخي وليست أرباحاً مضمونة.
        </p>

      </section>
    </main>
  );
}

function CompoundCalculator() {
  const [monthly, setMonthly] = useState(100);
  const [years, setYears] = useState(10);
  const [portfolioCode, setPortfolioCode] = useState<string>("moderate");

  const selected = CALC_PORTFOLIOS.find((p) => p.code === portfolioCode) ?? CALC_PORTFOLIOS[1];

  const futureValue = useMemo(
    () => compoundFutureValue(monthly, years, selected.annual),
    [monthly, years, selected.annual],
  );
  const totalContributions = monthly * years * 12;
  const estimatedReturn = Math.max(0, futureValue - totalContributions);

  return (
    <section className="relative mt-12 overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-bl from-primary/15 via-card to-accent/10 p-5 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.5)] sm:p-8">
      <div className="pointer-events-none absolute -left-24 -top-24 size-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            <TrendingUp className="size-3.5" />
            تفاعلي
          </span>
          <h2 className="text-2xl font-extrabold sm:text-3xl">حاسبة النمو التراكمي</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          اختر نوع المحفظة وحرّك المؤشرات، وشوف كم ممكن تصير فلوسك مستقبلاً.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {CALC_PORTFOLIOS.map((p) => {
            const active = p.code === selected.code;
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => setPortfolioCode(p.code)}
                aria-pressed={active}
                className={`rounded-2xl border p-3 text-right transition ${
                  active
                    ? "border-primary bg-primary/15 shadow-[0_0_25px_-8px_hsl(var(--primary)/0.8)]"
                    : "border-border/70 bg-background/40 hover:border-primary/50"
                }`}
              >
                <span className="block text-sm font-bold">{p.name}</span>
                <span className="bz-metric mt-1 block text-lg font-extrabold text-primary">
                  {p.annual}%
                </span>
                <span className="bz-metric block text-[11px] text-muted-foreground">
                  تذبذب {p.vol}%
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="space-y-7">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label htmlFor="monthly" className="text-base">الإيداع الشهري</Label>
                <span className="bz-metric rounded-xl bg-primary/15 px-3 py-1.5 text-base font-bold text-primary">
                  {monthly} د.ك
                </span>
              </div>
              <Slider
                id="monthly"
                className="py-2"
                value={[monthly]}
                min={10}
                max={500}
                step={10}
                onValueChange={([v]) => setMonthly(v ?? 10)}
              />
              <div className="bz-metric mt-2 flex justify-between text-xs text-muted-foreground">
                <span>10 د.ك</span>
                <span>500 د.ك</span>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label htmlFor="years" className="text-base">مدة الاستثمار</Label>
                <span className="bz-metric rounded-xl bg-primary/15 px-3 py-1.5 text-base font-bold text-primary">
                  {years} سنة
                </span>
              </div>
              <Slider
                id="years"
                className="py-2"
                value={[years]}
                min={1}
                max={30}
                step={1}
                onValueChange={([v]) => setYears(v ?? 1)}
              />
              <div className="bz-metric mt-2 flex justify-between text-xs text-muted-foreground">
                <span>سنة واحدة</span>
                <span>30 سنة</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-sm text-primary">
              <TrendingUp className="size-4" />
              <span>
                عائد سنوي تقديري لمحفظة {selected.name}:{" "}
                <span className="bz-metric font-bold">{selected.annual}%</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-primary/25 bg-background/60 p-6 text-center">
            <p className="text-sm text-muted-foreground">تقدير القيمة المستقبلية</p>
            <p className="bz-metric mt-2 text-4xl font-extrabold text-primary sm:text-5xl">
              {formatKwd(futureValue)}
            </p>
            <div className="bz-metric mt-4 space-y-1 text-xs text-muted-foreground">
              <p>إجمالي إيداعاتك: {formatKwd(totalContributions)}</p>
              <p>العائد التقديري: {formatKwd(estimatedReturn)}</p>
            </div>
            <Button asChild size="lg" className="mt-5">
              <Link to="/questionnaire">ابدأ استبيان مسارك الاستثماري</Link>
            </Button>
          </div>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          تنويه: النسبة المستخدمة ({selected.annual}%) تقديرية حسب المحفظة المختارة ومبنية على أداء
          تاريخي، وليست أرباحاً مضمونة. قيمة الاستثمار قد ترتفع أو تنخفض، والأداء السابق لا يضمن
          الأداء المستقبلي.
        </p>
      </div>
    </section>
  );

}
