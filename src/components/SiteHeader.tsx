import { Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BeezatLogo } from "@/components/BeezatLogo";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "الرئيسية" },
  { to: "/about", label: "من نحن" },
  { to: "/portfolios", label: "المحافظ" },
  { to: "/questionnaire", label: "مسارك الاستثماري" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
        <Link to="/" aria-label="بيزات - الرئيسية">
          <BeezatLogo compact />
        </Link>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-border/50 pt-2 sm:order-none sm:mr-auto sm:w-auto sm:border-0 sm:pt-0">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                pathname === l.to
                   ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                to="/dashboard"
                className={`rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  pathname === "/dashboard"
                     ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                لوحة التحكم
              </Link>
              <Link
                to="/portfolio"
                className={`rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  pathname === "/portfolio"
                     ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                محفظتي
              </Link>
              <Link
                to="/accounts"
                search={{ payment: "", paymentId: "" }}
                className={`rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  pathname === "/accounts"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                الحسابات
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => supabase.auth.signOut()}
                className="text-muted-foreground"
              >
                خروج
              </Button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium whitespace-nowrap text-primary-foreground"
            >
              دخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 bg-card/30 py-8">
      <div className="mx-auto max-w-6xl px-4 text-xs leading-6 text-muted-foreground">
        <p className="font-semibold text-primary">بيزات — استثمار آلي متوافق مع الشريعة</p>
        <p className="mt-1">
          الأسعار من مصدر بيانات عام وقد تتأخر. الإيداعات لا تعتمد إلا بعد تأكيد مزود الدفع، والسحب
          يخضع للمراجعة والتحويل البنكي.
        </p>
      </div>
    </footer>
  );
}
