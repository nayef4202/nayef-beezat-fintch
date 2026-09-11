import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RISK_QUESTIONS, normalizeScore } from "./risk";
import { computeDrift } from "./rebalance";

const answersSchema = z.object({
  answers: z
    .array(z.object({ questionId: z.string(), optionIndex: z.number().int().min(0) }))
    .min(RISK_QUESTIONS.length),
});

const moneySchema = z.object({ amount: z.number().positive().max(1000000) });

/** أسعار الصناديق الحقيقية المحدّثة من المصدر */
export const getAssetPrices = createServerFn({ method: "GET" }).handler(async () => {
  const { ensureFreshPrices } = await import("./prices.server");
  return await ensureFreshPrices();
});

/** تحديث فوري للأسعار من المصدر */
export const refreshAssetPrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { ensureFreshPrices } = await import("./prices.server");
    return await ensureFreshPrices(true);
  });

/** كل المحافظ النموذجية مع أوزانها (تدعم MongoDB Atlas تلقائياً مع التعبئة الذاتية وFallback) */
export const getModelPortfolios = createServerFn({ method: "GET" }).handler(async () => {
  // محاولة الجلب والتعبئة التلقائية أولاً من MongoDB Atlas
  try {
    const { getMongoDb } = await import("@/integrations/mongodb");
    const db = await getMongoDb("beezat");
    const collection = db.collection("model_portfolios");
    const count = await collection.countDocuments();

    // إذا كانت المجموعة فارغة في أطلس، نقوم بالبذر التلقائي فوراً
    if (count === 0) {
      const { seedBeezatMongoData } = await import("@/integrations/mongodb/seed");
      await seedBeezatMongoData();
    }

    const mongoPortfolios = await collection
      .find({})
      .sort({ sort_order: 1 })
      .toArray();

    if (mongoPortfolios && mongoPortfolios.length > 0) {
      return mongoPortfolios.map((p) => ({
        id: p._id ? String(p._id) : p.code,
        code: p.code,
        name_ar: p.name_ar,
        description_ar: p.description_ar,
        risk_level: p.risk_level,
        min_score: p.min_score,
        max_score: p.max_score,
        expected_return: p.expected_return,
        volatility: p.volatility,
        sort_order: p.sort_order,
        allocations: p.allocations ?? [],
      }));
    }
  } catch (mongoError) {
    console.warn("[MongoDB Atlas] fallback to Supabase for portfolios:", mongoError);
  }

  // في حال تعذر الوصول لأطلس، نعتمد على Supabase كاحتياط لضمان عدم توقف الموقع
  const { createClient } = await import("@supabase/supabase-js");
  const supabasePublic = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const { data: portfolios, error } = await supabasePublic
    .from("model_portfolios")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);

  const portfolioIds = portfolios?.map((p) => p.id) ?? [];
  const { data: allocations, error: aErr } = await supabasePublic
    .from("portfolio_allocations")
    .select("*")
    .in("portfolio_id", portfolioIds)
    .order("target_weight", { ascending: false });
  if (aErr) throw new Error(aErr.message);

  return portfolios?.map((p) => ({
    ...p,
    allocations: allocations?.filter((a) => a.portfolio_id === p.id) ?? [],
  }));
});

/** حساب درجة المخاطرة وحفظ نتيجة الاستبيان في MongoDB و Supabase */
export const submitAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => answersSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let points = 0;
    for (const q of RISK_QUESTIONS) {
      const answer = data.answers.find((a) => a.questionId === q.id);
      const option = answer ? q.options[answer.optionIndex] : undefined;
      if (!option) throw new Error("إجابة ناقصة أو غير صحيحة");
      points += option.points;
    }
    const score = normalizeScore(points);

    const { data: portfolios, error: pErr } = await supabase
      .from("model_portfolios")
      .select("*")
      .order("sort_order");
    if (pErr) throw new Error(pErr.message);

    const match =
      portfolios?.find((p) => score >= p.min_score && score <= p.max_score) ??
      portfolios?.[0];
    if (!match) throw new Error("ما تم العثور على محفظة مناسبة");

    const { data: saved, error } = await supabase
      .from("risk_assessments")
      .insert({
        user_id: userId,
        answers: data.answers,
        score,
        risk_level: match.risk_level,
        expected_return: match.expected_return,
        recommended_portfolio_id: match.id,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // إنشاء محفظة المستخدم تلقائياً إذا ما عنده محفظة نشطة
    const { data: active } = await supabase
      .from("user_portfolios")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    let userPortfolioId = active?.id ?? null;
    if (!userPortfolioId) {
      userPortfolioId = await createUserPortfolio(supabase, userId, match.id);
    }

    // حفظ تقييم المخاطر والمحفظة تلقائياً في MongoDB Atlas
    try {
      const { getMongoDb } = await import("@/integrations/mongodb");
      const db = await getMongoDb("beezat");
      await db.collection("risk_assessments").insertOne({
        user_id: userId,
        score,
        risk_level: match.risk_level,
        expected_return: match.expected_return,
        recommended_portfolio_code: match.code,
        recommended_portfolio_name: match.name_ar,
        answers: data.answers,
        created_at: new Date(),
      });
      await db.collection("user_portfolios").updateOne(
        { user_id: userId, is_active: true },
        {
          $set: {
            user_id: userId,
            portfolio_code: match.code,
            portfolio_name: match.name_ar,
            is_active: true,
            updated_at: new Date(),
          },
          $setOnInsert: {
            amount_kwd: 0,
            created_at: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (mErr) {
      console.warn("[MongoDB Atlas] Error writing assessment to MongoDB:", mErr);
    }

    return { assessment: saved, portfolio: match, userPortfolioId };
  });

type AuthedClient = SupabaseClient<Database>;

/** ينشئ محفظة المستخدم وأصولها بأوزان المحفظة النموذجية مع رصيد تجريبي مجاني 1,500 د.ك */
async function createUserPortfolio(
  supabase: AuthedClient,
  userId: string,
  portfolioId: string,
  initialAmountKwd: number = 1500,
): Promise<string> {
  const { data: allocations, error: aErr } = await supabase
    .from("portfolio_allocations")
    .select("*")
    .eq("portfolio_id", portfolioId);
  if (aErr) throw new Error(aErr.message);
  if (!allocations?.length) throw new Error("المحفظة غير متوفرة");

  await supabase.from("user_portfolios").update({ is_active: false }).eq("user_id", userId);

  const { data: up, error: upErr } = await supabase
    .from("user_portfolios")
    .insert({
      user_id: userId,
      portfolio_id: portfolioId,
      amount_kwd: initialAmountKwd,
      is_active: true,
    })
    .select("*")
    .single();
  if (upErr) throw new Error(upErr.message);

  const { ensureFreshPrices } = await import("./prices.server");
  const prices = await ensureFreshPrices().catch(() => []);
  const priceOf = (ticker: string) =>
    Number(prices.find((p) => p.ticker === ticker)?.price_kwd) || 0;

  const rows = allocations.map((a: Database["public"]["Tables"]["portfolio_allocations"]["Row"]) => {
    const value = Number(((initialAmountKwd * Number(a.target_weight)) / 100).toFixed(3));
    const price = priceOf(a.ticker);
    const units = price > 0 ? Number((value / price).toFixed(6)) : 0;
    return {
      user_portfolio_id: up.id,
      user_id: userId,
      ticker: a.ticker,
      asset_name_ar: a.asset_name_ar,
      asset_class_ar: a.asset_class_ar,
      target_weight: a.target_weight,
      value_kwd: value,
      units: units,
    };
  });

  let insertedHoldings = false;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: hErr } = await supabaseAdmin.from("holdings").insert(rows);
    if (!hErr) insertedHoldings = true;
  } catch {
    // fallback to authed client
  }
  if (!insertedHoldings) {
    const { error: hErr } = await supabase.from("holdings").insert(rows);
    if (hErr) console.warn("Fallback inserting holdings:", hErr.message);
  }

  // تسجيل معاملة الرصيد الترحيبي التجريبي
  try {
    await supabase.from("wallet_transactions").insert({
      user_id: userId,
      user_portfolio_id: up.id,
      transaction_type: "deposit",
      amount_kwd: initialAmountKwd,
      status: "completed",
      provider: "beezat_demo_bonus",
      idempotency_key: `demo_bonus_${up.id}`,
      metadata: { description: "رصيد تجريبي مجاني ترحيبي بقيمة 1,500 د.ك" },
    });
  } catch (txErr) {
    console.warn("Could not insert demo bonus tx:", txErr);
  }

  // مزامنة محفظة المستخدم مع MongoDB Atlas تلقائياً بالرصيد التجريبي
  try {
    const { getMongoDb } = await import("@/integrations/mongodb");
    const db = await getMongoDb("beezat");
    await db.collection("user_portfolios").updateOne(
      { user_id: userId, is_active: true },
      {
        $set: {
          user_id: userId,
          portfolio_id: portfolioId,
          amount_kwd: initialAmountKwd,
          is_active: true,
          is_demo: true,
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (mErr) {
    console.warn("[MongoDB Atlas] Error syncing user portfolio to MongoDB:", mErr);
  }

  return up.id as string;
}

/** تسجيل حساب جديد مع الاسم ورقم الهاتف وحفظ الملف الشخصي */
export const registerUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2, "الاسم قصير").max(80),
        email: z.string().trim().email("البريد غير صحيح"),
        phone: z
          .string()
          .trim()
          .regex(/^[0-9+\s-]{8,20}$/, "رقم الهاتف غير صحيح"),
        password: z.string().min(6, "كلمة المرور لازم 6 أحرف على الأقل").max(72),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    });
    if (error || !created.user) {
      const message = error?.message ?? "ما قدرنا ننشئ الحساب";
      if (/already|exists|registered/i.test(message)) {
        throw new Error("هذا البريد مسجّل من قبل، سجّل دخولك");
      }
      throw new Error(message);
    }

    const { error: pErr } = await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
    });
    if (pErr) throw new Error(pErr.message);

    return { userId: created.user.id, email: data.email };
  });

/** آخر نتيجة استبيان للمستخدم */
export const getLatestAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("risk_assessments")
      .select("*, model_portfolios:recommended_portfolio_id(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

/** اختيار محفظة وتكوين الأصول حسب الأوزان المستهدفة */
export const selectPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ portfolioId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // إذا عنده نفس المحفظة نشطة، ما نعيد إنشاءها حتى ما نفقد رصيده
    const { data: active } = await supabase
      .from("user_portfolios")
      .select("id, portfolio_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (active && active.portfolio_id === data.portfolioId) {
      return { userPortfolioId: active.id };
    }

    const userPortfolioId = await createUserPortfolio(supabase, userId, data.portfolioId);
    return { userPortfolioId };
  });

/** محفظة المستخدم الحالية بأسعار السوق الحقيقية مع الأصول وسجل إعادة التوازن */
export const getMyPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    let { data: up, error } = await supabase
      .from("user_portfolios")
      .select("*, model_portfolios:portfolio_id(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);

    // إذا كان المستخدم جديداً ولم ينشئ محفظة بعد، ننشئ له محفظة تجريبية بالرصيد المجاني 1,500 د.ك
    if (!up) {
      const { data: moderateModel } = await supabase
        .from("model_portfolios")
        .select("id")
        .eq("code", "moderate")
        .maybeSingle();

      const fallbackModel =
        moderateModel ||
        (await supabase.from("model_portfolios").select("id").limit(1).maybeSingle()).data;
      if (fallbackModel?.id) {
        const upId = await createUserPortfolio(supabase, userId, fallbackModel.id, 1500);
        const { data: newUp } = await supabase
          .from("user_portfolios")
          .select("*, model_portfolios:portfolio_id(*)")
          .eq("id", upId)
          .maybeSingle();
        up = newUp;
      }
    }

    if (!up) return null;

    const { ensureFreshPrices } = await import("./prices.server");
    const prices = await ensureFreshPrices();
    const priceOf = (ticker: string) =>
      Number(prices.find((p) => p.ticker === ticker)?.price_kwd) || 0;

    let { data: holdings, error: hErr } = await supabase
      .from("holdings")
      .select("*")
      .eq("user_portfolio_id", up.id)
      .order("target_weight", { ascending: false });
    if (hErr) throw new Error(hErr.message);

    // إذا كان رصيد المستخدم 0، نمنحه رصيد الـ 1,500 د.ك التجريبي فوراً ونوزعه على الأصول
    if (Number(up.amount_kwd) === 0) {
      up.amount_kwd = 1500;
      await supabase.from("user_portfolios").update({ amount_kwd: 1500 }).eq("id", up.id);
      if (holdings && holdings.length > 0) {
        for (const h of holdings) {
          const value = Number(((1500 * Number(h.target_weight)) / 100).toFixed(3));
          const price = priceOf(h.ticker);
          const units = price > 0 ? Number((value / price).toFixed(6)) : 0;
          h.value_kwd = value;
          h.units = units;
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("holdings").update({ value_kwd: value, units }).eq("id", h.id);
          } catch {
            await supabase.from("holdings").update({ value_kwd: value, units }).eq("id", h.id);
          }
        }
      }
    }

    // إعادة تقييم الأصول حسب آخر سعر سوق حقيقي
    const revalued: Array<{
      id: string;
      ticker: string;
      asset_name_ar: string;
      target_weight: number;
      value_kwd: number;
      units: number;
    }> = [];
    for (const h of holdings ?? []) {
      const price = priceOf(h.ticker);
      let units = Number(h.units);
      let value = Number(h.value_kwd);
      if (price > 0) {
        if (!units) units = Number((value / price).toFixed(6));
        const nextValue = Number((units * price).toFixed(3));
        if (nextValue !== value || units !== Number(h.units)) {
          value = nextValue;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error: uErr } = await supabaseAdmin
            .from("holdings")
            .update({ units, value_kwd: value, updated_at: new Date().toISOString() })
            .eq("id", h.id)
            .eq("user_id", userId);
          if (uErr) throw new Error(uErr.message);
        }
      }
      revalued.push({
        id: h.id,
        ticker: h.ticker,
        asset_name_ar: h.asset_name_ar,
        target_weight: Number(h.target_weight),
        value_kwd: value,
        units,
      });
    }

    const { data: events, error: eErr } = await supabase
      .from("rebalance_events")
      .select("*")
      .eq("user_portfolio_id", up.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (eErr) throw new Error(eErr.message);

    const drift = computeDrift(revalued);

    return {
      userPortfolio: up,
      holdings: revalued,
      events: events ?? [],
      drift,
      prices,
      invested: Number(up.amount_kwd),
    };
  });

/** إعادة ضبط أوزان المحفظة لتطابق النسب المستهدفة بأسعار السوق الحقيقية */
export const rebalanceNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: up, error } = await supabase
      .from("user_portfolios")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!up) throw new Error("ما عندك محفظة نشطة");

    const { ensureFreshPrices } = await import("./prices.server");
    const prices = await ensureFreshPrices();
    const priceOf = (ticker: string) =>
      Number(prices.find((p) => p.ticker === ticker)?.price_kwd) || 0;

    const { data: holdings, error: hErr } = await supabase
      .from("holdings")
      .select("*")
      .eq("user_portfolio_id", up.id);
    if (hErr) throw new Error(hErr.message);

    const drift = computeDrift(
      (holdings ?? []).map((h) => {
        const price = priceOf(h.ticker);
        const units = Number(h.units) || (price > 0 ? Number(h.value_kwd) / price : 0);
        return {
          id: h.id,
          ticker: h.ticker,
          asset_name_ar: h.asset_name_ar,
          target_weight: Number(h.target_weight),
          value_kwd: price > 0 ? Number((units * price).toFixed(3)) : Number(h.value_kwd),
        };
      }),
    );

    if (!drift.needsRebalance) {
      return { rebalanced: false, maxDrift: drift.maxDrift };
    }

    for (const row of drift.rows) {
      const price = priceOf(row.ticker);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: uErr } = await supabaseAdmin
        .from("holdings")
        .update({
          value_kwd: row.target_value,
          units: price > 0 ? Number((row.target_value / price).toFixed(6)) : 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("user_id", userId);
      if (uErr) throw new Error(uErr.message);
    }

    const { supabaseAdmin: adminEv } = await import("@/integrations/supabase/client.server");
    const { error: evErr } = await adminEv.from("rebalance_events").insert({
      user_portfolio_id: up.id,
      user_id: userId,
      max_drift: drift.maxDrift,
      trades: drift.rows.map((r) => ({
        ticker: r.ticker,
        name: r.asset_name_ar,
        drift: r.drift,
        trade: r.trade,
      })),
    });
    if (evErr) throw new Error(evErr.message);

    await supabase
      .from("user_portfolios")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", up.id);

    return { rebalanced: true, maxDrift: drift.maxDrift, trades: drift.rows.length };
  });

/** ملخص الحساب، دليل المحافظ المشتركة، وسجل الحركات المالية */
export const getAccountsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, share_portfolio")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      await supabase.from("profiles").insert({
        id: userId,
        full_name: typeof claims.user_metadata?.["full_name"] === "string" ? claims.user_metadata["full_name"] : null,
        email: typeof claims.email === "string" ? claims.email : null,
      });
    }

    const { data: activePortfolio, error: portfolioError } = await supabase
      .from("user_portfolios")
      .select("*, model_portfolios:portfolio_id(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (portfolioError) throw new Error(portfolioError.message);

    let portfolio: null | {
      userPortfolio: typeof activePortfolio;
      drift: ReturnType<typeof computeDrift>;
    } = null;
    if (activePortfolio) {
      const { data: holdings, error: holdingsError } = await supabase
        .from("holdings")
        .select("id, ticker, asset_name_ar, target_weight, units, value_kwd")
        .eq("user_portfolio_id", activePortfolio.id);
      if (holdingsError) throw new Error(holdingsError.message);
      const { ensureFreshPrices } = await import("./prices.server");
      const prices = await ensureFreshPrices();
      const priceOf = (ticker: string) => Number(prices.find((p) => p.ticker === ticker)?.price_kwd) || 0;
      portfolio = {
        userPortfolio: activePortfolio,
        drift: computeDrift((holdings ?? []).map((holding) => ({
          id: holding.id,
          ticker: holding.ticker,
          asset_name_ar: holding.asset_name_ar,
          target_weight: Number(holding.target_weight),
          value_kwd: priceOf(holding.ticker) > 0
            ? Number(holding.units) * priceOf(holding.ticker)
            : Number(holding.value_kwd),
        }))),
      };
    }
    const { data: transactions, error: tErr } = await supabase
      .from("wallet_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (tErr) throw new Error(tErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: directory, error: dErr } = await supabaseAdmin
      .from("shared_portfolios_public")
      .select("masked_name, portfolio_name, total_assets_kwd, updated_at")
      .order("total_assets_kwd", { ascending: false })
      .limit(50);
    if (dErr) throw new Error(dErr.message);

    if (portfolio && (profile?.share_portfolio ?? false)) {
      const model = portfolio.userPortfolio?.model_portfolios as unknown as { name_ar?: string } | null;
      await supabaseAdmin
        .from("shared_portfolio_directory")
        .update({
          portfolio_name: model?.name_ar ?? "محفظة بيزات",
          total_assets_kwd: portfolio.drift.total,
          updated_at: new Date().toISOString(),
        })
        .eq("user_portfolio_id", portfolio.userPortfolio?.id ?? "");
    }

    return {
      portfolio,
      transactions: transactions ?? [],
      directory: directory ?? [],
      sharePortfolio: profile?.share_portfolio ?? false,
      paymentReady: Boolean(process.env["STRIPE_TEST_API_KEY"]),
    };
  });

/** السماح بإظهار اسم مختصر وإجمالي المحفظة للمستخدمين المسجلين */
export const setPortfolioSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const fullName =
      typeof claims.user_metadata?.["full_name"] === "string" ? claims.user_metadata["full_name"].trim() : "";
    const maskedName = fullName
      ? `${fullName.split(" ")[0]}${fullName.split(" ")[1] ? ` ${fullName.split(" ")[1]?.[0]}.` : ""}`
      : "مستثمر في بيزات";

    const { error: pErr } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName || null,
      email: typeof claims.email === "string" ? claims.email : null,
      share_portfolio: data.enabled,
    });
    if (pErr) throw new Error(pErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.enabled) {
      const { data: owned } = await supabase
        .from("user_portfolios")
        .select("id")
        .eq("user_id", userId);
      const ids = (owned ?? []).map((row) => row.id);
      if (ids.length) await supabaseAdmin.from("shared_portfolio_directory").delete().in("user_portfolio_id", ids);
      return { enabled: false };
    }

    const { data: active, error: activeError } = await supabase
      .from("user_portfolios")
      .select("id, model_portfolios:portfolio_id(name_ar)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (activeError) throw new Error(activeError.message);
    if (!active) throw new Error("أنشئ محفظتك أولاً");
    const { data: holdings, error: holdingsError } = await supabase
      .from("holdings")
      .select("ticker, units, value_kwd")
      .eq("user_portfolio_id", active.id);
    if (holdingsError) throw new Error(holdingsError.message);
    const { ensureFreshPrices } = await import("./prices.server");
    const prices = await ensureFreshPrices();
    const totalAssets = (holdings ?? []).reduce((total, holding) => {
      const price = Number(prices.find((row) => row.ticker === holding.ticker)?.price_kwd) || 0;
      return total + (price > 0 ? Number(holding.units) * price : Number(holding.value_kwd));
    }, 0);
    const model = active.model_portfolios as unknown as { name_ar?: string } | null;
    const { error } = await supabaseAdmin.from("shared_portfolio_directory").upsert({
      user_portfolio_id: active.id,
      user_id: userId,
      masked_name: maskedName,
      portfolio_name: model?.name_ar ?? "محفظة بيزات",
      total_assets_kwd: Number(totalAssets.toFixed(3)),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { enabled: true };
  });

/** إنشاء جلسة دفع إيداع عبر سترايب */
export const createDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => moneySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: portfolio, error } = await supabase
      .from("user_portfolios")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!portfolio) throw new Error("أنشئ محفظتك أولاً");

    const request = getRequest();
    const origin = new URL(request.url).origin;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: transaction, error: tErr } = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        user_portfolio_id: portfolio.id,
        transaction_type: "deposit",
        amount_kwd: data.amount,
        status: "pending",
      })
      .select("id")
      .single();
    if (tErr) throw new Error(tErr.message);

    try {
      const { createStripeCheckoutSession } = await import("./stripe.server");
      const session = await createStripeCheckoutSession({
        amountKwd: data.amount,
        customerEmail: typeof claims.email === "string" ? claims.email : "",
        clientReference: transaction.id,
        successUrl: `${origin}/accounts?payment=success&paymentId={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/accounts?payment=failed&paymentId=`,
      });
      if (!session.url) throw new Error("تعذّر فتح صفحة الدفع");
      await supabaseAdmin
        .from("wallet_transactions")
        .update({ provider_reference: session.id })
        .eq("id", transaction.id);
      return { paymentUrl: session.url };
    } catch (paymentError) {
      await supabaseAdmin
        .from("wallet_transactions")
        .update({ status: "failed", failure_reason: "تعذّر إنشاء فاتورة الدفع" })
        .eq("id", transaction.id);
      throw paymentError;
    }
  });

/** التحقق من نتيجة سترايب واعتماد الإيداع مرة واحدة */
export const confirmDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paymentId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getStripeCheckoutSession, toFils } = await import("./stripe.server");
    const session = await getStripeCheckoutSession(data.paymentId);
    if (session.payment_status !== "paid") throw new Error("لم يكتمل الدفع بعد");
    if (!session.client_reference_id) throw new Error("عملية الإيداع غير موجودة");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: transaction } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id, user_id, amount_kwd, status")
      .eq("id", session.client_reference_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!transaction) throw new Error("عملية الإيداع غير موجودة");
    if (transaction.status === "completed") return { completed: true };
    if (toFils(Number(transaction.amount_kwd)) !== Number(session.amount_total)) {
      throw new Error("مبلغ الدفع غير مطابق");
    }

    const { ensureFreshPrices } = await import("./prices.server");
    await ensureFreshPrices(true);
    const { error } = await supabaseAdmin.rpc("finalize_wallet_deposit", {
      _transaction_id: transaction.id,
      _payment_id: data.paymentId,
    });
    if (error) throw new Error(error.message);
    return { completed: true };
  });

/** تسجيل طلب سحب؛ التنفيذ البنكي يبقى معلّقاً حتى اعتماده من مزود التحويل */
export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => moneySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: active, error: activeError } = await context.supabase
      .from("user_portfolios")
      .select("id")
      .eq("user_id", context.userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (activeError) throw new Error(activeError.message);
    if (!active) throw new Error("ما عندك محفظة نشطة");
    const { data: holdings, error: holdingsError } = await context.supabase
      .from("holdings")
      .select("ticker, units, value_kwd")
      .eq("user_portfolio_id", active.id);
    if (holdingsError) throw new Error(holdingsError.message);
    const { ensureFreshPrices } = await import("./prices.server");
    const prices = await ensureFreshPrices();
    const available = (holdings ?? []).reduce((total, holding) => {
      const price = Number(prices.find((row) => row.ticker === holding.ticker)?.price_kwd) || 0;
      return total + (price > 0 ? Number(holding.units) * price : Number(holding.value_kwd));
    }, 0);
    if (data.amount > available) throw new Error("المبلغ أكبر من قيمة المحفظة الحالية");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("wallet_transactions").insert({
      user_id: context.userId,
      user_portfolio_id: active.id,
      transaction_type: "withdrawal",
      amount_kwd: data.amount,
      status: "pending",
      metadata: { settlement: "manual_review" },
    });
    if (error) throw new Error(error.message);
    return { requested: true };
  });

/** فحص حالة الربط مع MongoDB AI */
export const checkMongoDBAIStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { mongodbAI } = await import("@/integrations/mongodb");
  return await mongodbAI.checkConnection();
});

/** بحث وترتيب ذكي للاستثمارات والمحافظ المتوافقة مع الشريعة باستخدام MongoDB AI */
export const smartInvestmentSearch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      query: z.string().min(2),
      candidates: z.array(z.string()).min(1),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const { mongodbAI } = await import("@/integrations/mongodb");
    const result = await mongodbAI.rerank({
      query: data.query,
      documents: data.candidates,
      model: "rerank-2",
      returnDocuments: true,
    });
    return result;
  });

/** فحص حالة الربط مع قاعدة بيانات MongoDB Atlas Cluster */
export const checkMongoDBDatabaseStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { testMongoDbConnection } = await import("@/integrations/mongodb");
  return await testMongoDbConnection();
});

/** نقل وتجهيز بيانات بيزات الأساسية داخل قاعدة بيانات MongoDB Atlas */
export const seedBeezatToMongo = createServerFn({ method: "POST" }).handler(async () => {
  const { seedBeezatMongoData } = await import("@/integrations/mongodb");
  return await seedBeezatMongoData();
});



