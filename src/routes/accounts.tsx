import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  confirmDeposit,
  createDeposit,
  getAccountsOverview,
  requestWithdrawal,
  setPortfolioSharing,
} from "@/lib/beezat.functions";
import { formatKwd } from "@/lib/risk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KnetLogo } from "@/components/KnetLogo";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/accounts")({
  validateSearch: (search: Record<string, unknown>) => ({
    payment: typeof search["payment"] === "string" ? search["payment"] : "",
    paymentId: typeof search["paymentId"] === "string" ? search["paymentId"] : "",
  }),
  head: () => ({
    meta: [
      { title: "الحسابات وسجل الصفقات | بيزات" },
      { name: "description", content: "تابع محفظتك وإجمالي أصولك وطلبات الإيداع والسحب في بيزات." },
      { property: "og:title", content: "الحسابات وسجل الصفقات | بيزات" },
      { property: "og:description", content: "محفظتك وإجمالي الأصول وسجل العمليات المالية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountsPage,
});

type Action = "deposit" | "withdrawal";

function AccountsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/accounts" });
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getAccountsOverview);
  const sharePortfolio = useServerFn(setPortfolioSharing);
  const startDeposit = useServerFn(createDeposit);
  const finishDeposit = useServerFn(confirmDeposit);
  const withdraw = useServerFn(requestWithdrawal);
  const [action, setAction] = useState<Action | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, navigate, user]);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts-overview", user?.id],
    queryFn: () => fetchOverview(),
    enabled: Boolean(user),
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user || search.payment !== "success" || !search.paymentId) return;
    let active = true;
    finishDeposit({ data: { paymentId: search.paymentId } })
      .then(async () => {
        if (!active) return;
        await qc.invalidateQueries({ queryKey: ["accounts-overview", user.id] });
        await qc.invalidateQueries({ queryKey: ["my-portfolio", user.id] });
        toast.success("تم تأكيد الإيداع وإضافته لمحفظتك");
        navigate({ to: "/accounts", search: { payment: "", paymentId: "" }, replace: true });
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "تعذّر تأكيد الإيداع"));
    return () => { active = false; };
  }, [finishDeposit, navigate, qc, search.payment, search.paymentId, user]);

  const totalAssets = Number(data?.portfolio?.drift?.total ?? 0);
  const transactions = data?.transactions ?? [];
  const directory = data?.directory ?? [];
  const parsedAmount = useMemo(() => Number(amount), [amount]);

  async function confirmAction() {
    if (!action || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setBusy(true);
    try {
      if (action === "deposit") {
        const result = await startDeposit({ data: { amount: parsedAmount } });
        // صفحة الدفع لا تفتح داخل إطار المعاينة، فنفتحها بنافذة مستقلة
        const inFrame = typeof window !== "undefined" && window.top !== window.self;
        if (inFrame) {
          const opened = window.open(result.paymentUrl, "_blank", "noopener,noreferrer");
          if (!opened) {
            toast.error("اسمح بالنوافذ المنبثقة لفتح صفحة الدفع");
          } else {
            toast.success("انفتحت صفحة الدفع بنافذة جديدة");
          }
          setAction(null);
          setAmount("");
        } else {
          window.location.assign(result.paymentUrl);
        }
        return;
      }
      await withdraw({ data: { amount: parsedAmount } });
      await qc.invalidateQueries({ queryKey: ["accounts-overview", user?.id] });
      toast.success("تم تسجيل طلب السحب للمراجعة والتحويل البنكي");
      setAction(null);
      setAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSharing() {
    try {
      await sharePortfolio({ data: { enabled: !data?.sharePortfolio } });
      await qc.invalidateQueries({ queryKey: ["accounts-overview", user?.id] });
      toast.success(data?.sharePortfolio ? "تم إخفاء محفظتك" : "تمت مشاركة الاسم المختصر وإجمالي الأصول");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تحديث الخصوصية");
    }
  }

  if (isLoading) return <main className="p-10 text-center">جاري تحميل الحسابات...</main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الحسابات</h1>
          <p className="mt-1 text-sm text-muted-foreground">محفظتك، العمليات المالية، ومجتمع مستثمري بيزات.</p>
        </div>
        <Button asChild variant="outline"><Link to="/portfolio">تفاصيل محفظتي</Link></Button>
      </div>

      <section className="bz-panel bz-surface mt-6 rounded-xl p-5 sm:p-6">
        <p className="text-xs text-muted-foreground">إجمالي أصول محفظتي</p>
        <p className="bz-metric mt-2 text-4xl font-bold">{formatKwd(totalAssets)}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button onClick={() => { setAction("deposit"); setAmount(""); }} disabled={!data?.portfolio}>
            <ArrowDownToLine /> إيداع
          </Button>
          <Button variant="outline" onClick={() => { setAction("withdrawal"); setAmount(""); }} disabled={!data?.portfolio}>
            <ArrowUpFromLine /> سحب
          </Button>
        </div>
        {!data?.portfolio && <p className="mt-4 text-sm text-muted-foreground">أنشئ محفظة قبل تنفيذ أي عملية مالية.</p>}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">سجل الصفقات</h2>
          {transactions.length ? (
            <ul className="space-y-2">
              {transactions.map((tx) => (
                <li key={tx.id} className="bz-panel flex items-center justify-between gap-3 rounded-lg p-4 text-sm">
                  <div>
                    <p className="font-medium">{tx.transaction_type === "deposit" ? "إيداع" : "سحب"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString("en-GB")}</p>
                  </div>
                  <div className="text-left">
                    <p className={tx.transaction_type === "deposit" ? "text-primary" : "text-destructive"}>
                      {tx.transaction_type === "deposit" ? "+" : "-"}{formatKwd(Number(tx.amount_kwd))}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tx.status === "completed" ? "مكتملة" : tx.status === "failed" ? "فشلت" : "قيد المعالجة"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <div className="bz-panel rounded-lg p-5 text-sm text-muted-foreground">ما عندك صفقات مالية مسجلة بعد.</div>}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold"><Users className="size-4" /> محافظ المجتمع</h2>
            <Button size="sm" variant={data?.sharePortfolio ? "default" : "outline"} onClick={toggleSharing} disabled={!data?.portfolio}>
              {data?.sharePortfolio ? "مشاركة مفعّلة" : "شارك محفظتي"}
            </Button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">تظهر فقط المحافظ التي وافق أصحابها، باسم مختصر ودون تفاصيل شخصية.</p>
          {directory.length ? (
            <ul className="space-y-2">
              {directory.map((item, index) => (
                <li key={`${item.masked_name}-${index}`} className="bz-panel flex justify-between gap-3 rounded-lg p-4 text-sm">
                  <div><p className="font-medium">{item.masked_name}</p><p className="mt-1 text-xs text-muted-foreground">{item.portfolio_name}</p></div>
                  <span className="bz-metric font-semibold">{formatKwd(Number(item.total_assets_kwd))}</span>
                </li>
              ))}
            </ul>
          ) : <div className="bz-panel rounded-lg p-5 text-sm text-muted-foreground">لا توجد محافظ مشتركة حتى الآن.</div>}
        </section>
      </div>

      <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{action === "deposit" ? "تأكيد مبلغ الإيداع" : "تأكيد طلب السحب"}</DialogTitle>
            <DialogDescription>
              {action === "deposit"
                ? "سيتم تحويلك إلى صفحة الدفع الآمنة عبر سترايب، ولن يضاف المبلغ قبل تأكيد الدفع."
                : "سيُسجل الطلب للمراجعة ثم يُحوّل إلى حسابك البنكي."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="amount">المبلغ بالدينار الكويتي</Label>
            <Input id="amount" type="number" min="0.001" step="0.001" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {parsedAmount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
              <CheckCircle2 className="size-4" /> المبلغ المطلوب: {formatKwd(parsedAmount)}
            </div>
          )}
          {action === "deposit" && (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center gap-3">
                <KnetLogo className="h-9 w-24 shrink-0" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  ندعم الدفع بـ KNET وبطاقات فيزا وماستركارد. الدفع يتم عبر بوابة آمنة ولا نحتفظ
                  ببيانات بطاقتك.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>إلغاء</Button>
            <Button onClick={confirmAction} disabled={busy || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || (action === "deposit" && !data?.paymentReady)}>
              {busy ? "جاري التنفيذ..." : action === "deposit" ? "الدفع عبر سترايب" : "تسجيل طلب السحب"}
            </Button>
          </DialogFooter>
          {action === "deposit" && !data?.paymentReady && <p className="text-xs text-destructive">الإيداع متوقف حتى إضافة مفتاح سترايب الآمن.</p>}
        </DialogContent>
      </Dialog>
    </main>
  );
}