import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
        await register({ data: { fullName: name, email, phone, password } });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("ما قدرنا نكمل الدخول عبر جوجل");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/portfolio" });
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
      <p className="mb-6 text-sm text-muted-foreground">
        استثمار آلي متوافق مع الشريعة الإسلامية.
      </p>

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

      <Button variant="outline" className="mt-3 w-full" onClick={handleGoogle}>
        المتابعة عبر جوجل
      </Button>

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
