const API_BASE = "https://api.stripe.com/v1";

function getKey() {
  const key = process.env["STRIPE_TEST_API_KEY"];
  if (!key) throw new Error("ربط سترايب غير مكتمل بعد");
  return key;
}

async function stripeRequest<T>(path: string, method: "GET" | "POST", form?: Record<string, string>) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    ...(form ? { body: new URLSearchParams(form).toString() } : {}),
  });
  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || "تعذّر الاتصال بمزود الدفع");
  }
  return payload as T;
}

/** سترايب يستخدم أصغر وحدة؛ الدينار الكويتي من ثلاث خانات عشرية (فلس) */
export function toFils(amountKwd: number) {
  return Math.round(amountKwd * 1000);
}

export type StripeSession = {
  id: string;
  url: string | null;
  payment_status: string;
  status: string;
  amount_total: number | null;
  currency: string;
  client_reference_id: string | null;
  payment_intent: string | null;
};

export async function createStripeCheckoutSession(input: {
  amountKwd: number;
  customerEmail: string;
  clientReference: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripeRequest<StripeSession>("/checkout/sessions", "POST", {
    mode: "payment",
    "payment_method_types[0]": "card",
    client_reference_id: input.clientReference,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "kwd",
    "line_items[0][price_data][unit_amount]": String(toFils(input.amountKwd)),
    "line_items[0][price_data][product_data][name]": "إيداع في محفظة بيزات",
    "metadata[transaction_id]": input.clientReference,
  });
}

export async function getStripeCheckoutSession(sessionId: string) {
  return stripeRequest<StripeSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`, "GET");
}
