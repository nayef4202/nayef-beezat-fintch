import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";
import { RISK_QUESTIONS } from "@/lib/risk";
import { submitAssessment } from "@/lib/beezat.functions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BeezatLogo } from "@/components/BeezatLogo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import q1Age from "@/assets/q1-age.png";
import q2Horizon from "@/assets/q2-horizon.png";
import q3Experience from "@/assets/q3-experience.png";
import q4Drop from "@/assets/q4-drop.png";
import q5Saving from "@/assets/q5-saving.png";
import q6Emergency from "@/assets/q6-emergency.png";
import q7Goal from "@/assets/q7-goal.png";

const STEP_ART = [
  { src: q1Age, alt: "مسار نمو من برعم صغير إلى شجرة كبيرة يرمز لمراحل العمر" },
  { src: q2Horizon, alt: "ساعة رملية وتقويم يمثلان مدة الاستثمار" },
  { src: q3Experience, alt: "شخص يقرأ كتاباً مع مخططات استثمار" },
  { src: q4Drop, alt: "شاشة تعرض سهماً هابطاً يمثل نزول السوق" },
  { src: q5Saving, alt: "يد تضع عملة في حصالة للادخار الشهري" },
  { src: q6Emergency, alt: "درع ومظلة تحمي مبلغ الطوارئ" },
  { src: q7Goal, alt: "هدف بسهم في المنتصف وبيت ودرج صاعد" },
];

const STAGE_NAMES = ["العمر", "المدة", "الخبرة", "ردة الفعل", "الادخار", "الطوارئ", "الهدف"];

export const Route = createFileRoute("/questionnaire")({
  head: () => ({
    meta: [
      { title: "استبيان مسارك الاستثماري | بيزات" },
      {
        name: "description",
        content: "أسئلة بسيطة تحدد مستوى تحملك للمخاطرة والمحفظة الإسلامية المناسبة لك.",
      },
      { property: "og:title", content: "استبيان مسارك الاستثماري | بيزات" },
      { property: "og:description", content: "حدد مسارك الاستثماري خلال دقيقتين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Questionnaire,
});

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-label="تقدم الاستبيان">
      {Array.from({ length: total }, (_, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <div key={i} className="flex items-center gap-2 sm:gap-3">
            {i > 0 && (
              <span
                className={cn(
                  "h-0.5 w-4 rounded-full transition-colors duration-300 sm:w-8",
                  i <= step ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full border text-xs font-bold transition-all duration-300 sm:size-9",
                done && "border-primary bg-primary text-primary-foreground",
                current &&
                  "border-primary bg-primary/15 text-primary shadow-[0_0_16px_-2px] shadow-primary/60 ring-2 ring-primary/40 quiz-pulse",
                !done && !current && "border-border bg-card/60 text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Questionnaire() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const submit = useServerFn(submitAssessment);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const question = RISK_QUESTIONS[step]!;
  const total = RISK_QUESTIONS.length;

  async function pick(index: number) {
    const next = { ...answers, [question.id]: index };
    setAnswers(next);
    if (step < total - 1) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      await submit({
        data: {
          answers: RISK_QUESTIONS.map((q) => ({
            questionId: q.id,
            optionIndex: next[q.id] ?? 0,
          })),
        },
      });
      navigate({ to: "/result" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ما قدرنا نحفظ إجاباتك");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col px-4 py-6">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between">
        <BeezatLogo compact />
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <X className="size-3.5" />
          إنهاء والخروج
        </Link>
      </div>

      <div className="mx-auto mt-8 w-full max-w-xl">
        <StepBar step={step} total={total} />
        <p className="mt-3 text-center text-xs text-muted-foreground">
          سؤال {step + 1} من {total} — {STAGE_NAMES[step]}
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8">
        <div
          key={step}
          className="quiz-step rounded-3xl border border-border/60 bg-card/40 p-6 sm:p-8"
        >
          <img
            src={STEP_ART[step]!.src}
            alt={STEP_ART[step]!.alt}
            loading="lazy"
            width={1024}
            height={1024}
            className="mx-auto h-36 w-auto object-contain quiz-glow sm:h-44"
          />

          <h1 className="mt-4 text-center text-2xl font-semibold leading-10">{question.text}</h1>

          <div className="mt-6 space-y-3">
            {question.options.map((opt, i) => (
              <Button
                key={opt.label}
                variant="outline"
                type="button"
                disabled={busy}
                onClick={() => pick(i)}
                className="h-auto min-h-14 w-full justify-start whitespace-normal rounded-3xl p-4 text-right leading-7 transition-transform duration-200 hover:scale-[1.02]"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {step > 0 && (
          <Button
            variant="ghost"
            className="mx-auto mt-4 text-muted-foreground/70 hover:text-muted-foreground"
            onClick={() => setStep(step - 1)}
            disabled={busy}
          >
            رجوع
          </Button>
        )}
      </div>
    </main>
  );
}
