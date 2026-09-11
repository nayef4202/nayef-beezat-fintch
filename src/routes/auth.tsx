import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { registerUser } from "@/lib/beezat.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BeezatLogo } from "@/components/BeezatLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | بيزات" },
      { name: "description", content: "سجّل دخولك إلى بيزات وابدأ استثمارك الآلي المتوافق مع الشريعة." },
      { property: "og:title", content: "تسجيل الدخول | بيزات" },
      { property: "og:description", content: "سجّل دخولك إلى بيزات وابدأ استثمارك الآلي المتوافق مع الشريعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const register = useServerFn(registerUser);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/portfolio" });
  }, [user, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        try {
          await register({ data: { fullName: name, email, phone, password } });
        } catch (serverErr: unknown) {
          const msg = serverErr instanceof Error ? serverErr.message : String(serverErr);
          // في حال عدم وجود SUPABASE_SERVICE_ROLE_KEY على السيرفر، يتم الاعتماد على تسجيل Supabase المباشر
          if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
            const { error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: name,
                  phone,
                },
              },
            });
            if (signUpError) throw signUpError;
          } else {
            throw serverErr;
          }
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (signInError.message.includes("Email not confirmed")) {
            toast.success("تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيده.");
            setBusy(false);
            return;
          }
          throw signInError;
        }
        toast.success("تم إنشاء حسابك بنجاح");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("أهلاً فيك من جديد");
      }
      navigate({ to: "/portfolio" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "صار خطأ، جرّب مرة ثانية");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center px-4 py-10">
      <Link to="/" className="mb-8 flex justify-center" aria-label="العودة إلى بيزات">
        <BeezatLogo />
      </Link>
      <section className="bz-panel rounded-xl p-5 sm:p-6">
      <h1 className="mb-1 text-xl font-semibold">
        {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        استثمار آلي متوافق مع الشريعة الإسلامية.
      </p>

      {mode === "signup" && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary font-medium">
          <span className="text-base">🎁</span>
          <span>هدية تسجيل: رصيد تجريبي مجاني <strong>1,500 د.ك</strong> مضاف لمحفظتك فوراً لتجربة الاستثمار الذكي!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                inputMode="tel"
                placeholder="+965 5000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">كلمة المرور</Label>
          <Input
            id="password"
            type="password"
            dir="ltr"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "signin" ? "دخول" : "إنشاء الحساب"}
        </Button>
      </form>

      <Button
        variant="link"
        type="button"
        className="mt-4 w-full text-muted-foreground"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "ما عندك حساب؟ سجّل الحين" : "عندك حساب؟ سجّل دخولك"}
      </Button>
      </section>
    </main>
  );
}
