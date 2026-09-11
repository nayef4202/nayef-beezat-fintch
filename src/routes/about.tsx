import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, Lightbulb, ShieldCheck, TrendingUp, Wallet, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeezatLogo } from "@/components/BeezatLogo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن | بيزات" },
      {
        name: "description",
        content:
          "تعرّف على بيزات: منصة تقنية مالية كويتية تُدير المحافظ الاستثمارية آلياً بصناديق مؤشرات عالمية متوافقة مع الشريعة.",
      },
      { property: "og:title", content: "من نحن | بيزات" },
      {
        property: "og:description",
        content:
          "منصة كويتية لاستثمار آلي ذكي يمكّن الأفراد من بناء ثرواتهم وتأمين مستقبلهم المالي.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://beezat-islamic-invest.lovable.app/about" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://beezat-islamic-invest.lovable.app/about" },
    ],
  }),
  component: AboutPage,
});

const features = [
  {
    icon: Wallet,
    title: "استثمار آلي متاح للجميع",
    description: "حد أدنى منخفض ورسوم قليلة لتبدأ رحلتك الاستثمارية بدون تعقيد.",
  },
  {
    icon: TrendingUp,
    title: "إيداع وسحب سهل",
    description: "مرونة كاملة في عمليات الإيداع والسحب عبر قنوات دفع محلية موثوقة.",
  },
  {
    icon: ShieldCheck,
    title: "حماية الأصول بإعادة التوازن",
    description: "خوارزمية إعادة التوازن الدورية تضبط أوزان المحفظة تلقائياً عند تقلب الأسواق.",
  },
  {
    icon: Users,
    title: "محافظ إسلامية مجهزة",
    description: "محافظ تناسب جميع الأهداف: منخفضة المخاطر، متوازنة، ونمو عالي.",
  },
];

function AboutPage() {
  return (
    <main className="bz-surface min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        {/* Hero / Intro */}
        <section className="grid items-center gap-8 sm:grid-cols-2">
          <div className="order-2 flex justify-center sm:order-1">
            <BeezatLogo />
          </div>
          <div className="order-1 text-right sm:order-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="size-1.5 rounded-full bg-accent" />
              منصة كويتية • متوافقة مع الشريعة
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
              منصة <span className="text-primary">بيزات</span>
              <br />
              استثمار آلي للجميع
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              نحن منصة تقنية مالية (FinTech) كويتية تهدف إلى تمكين المستثمرين الصغار والمبتدئين في
              مجال التداول الرقمي من خوض عالم الاستثمار بذكاء وأمان.
            </p>
          </div>
        </section>

        {/* Vision */}
        <section className="mt-10">
          <div className="bz-panel rounded-2xl p-6 sm:p-10">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Target className="size-5" />
              </span>
              <h2 className="text-xl font-bold sm:text-2xl">رؤيتنا</h2>
            </div>
            <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">
              أن نكون المنصة المالية الأولى والأكثر ثقة في الكويت والمنطقة في تمكين الأفراد من بناء
              ثرواتهم وتأمين مستقبلهم المالي عبر استثمار آلي، ذكي، ومتاح للجميع بضغطة زر.
            </p>
          </div>
        </section>

        {/* Concept: Problem + Solution */}
        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="bz-panel rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
                <Lightbulb className="size-5" />
              </span>
              <h2 className="text-lg font-bold sm:text-xl">المشكلة</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              يسعى الكثيرون للاستثمار ولكن يواجهون فجوة كبيرة بسبب قلة الخبرة بالأسس المالية، مما
              يتسبب في أخطاء وتجارب مكلفة قد تُكلفهم أموالهم.
            </p>
          </div>

          <div className="bz-panel rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                <TrendingUp className="size-5" />
              </span>
              <h2 className="text-lg font-bold sm:text-xl">الحل الذكي</h2>
            </div>
            <p className="mt-4 leading-7 text-muted-foreground">
              نوفر مستشاراً آلياً (Robo-Advisor) يُدير المحافظ الاستثمارية آلياً بالكامل عبر
              خوارزميات مبرمجة دون أي تدخل بشري، لتوزيع الأصول وتداولها تلقائياً في صناديق المؤشرات
              العالمية (ETFs) بما يتوافق كلياً مع أحكام الشريعة الإسلامية وبحسب مستوى مخاطرة
              العميل.
            </p>
          </div>
        </section>

        {/* Goals & Advantages */}
        <section className="mt-10">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">أهدافنا ومميزاتنا التنافسية</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="bz-panel rounded-2xl p-5 transition-colors hover:bg-primary/5">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Slogan */}
        <section className="mt-10 text-center">
          <div className="bz-panel rounded-2xl bg-primary/10 p-8 sm:p-12">
            <p className="text-2xl font-extrabold text-primary sm:text-4xl">
              مِنْ خَرْدَة... صَارَتْ ثَرْوَة
            </p>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              ابدأ بخطوات بسيطة واترك الخوارزمية تبني مستقبلك المالي.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/questionnaire">ابدأ استبيان مسارك الاستثماري</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/portfolios">تصفح المحافظ</Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
