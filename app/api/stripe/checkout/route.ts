import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Stripe price IDs — set these in Vercel env vars once products are created in Stripe dashboard
// STRIPE_PRICE_STARTER    — $800 CAD one-time
// STRIPE_PRICE_STANDARD   — $1,800 CAD one-time
// STRIPE_PRICE_RETAINER   — $200 CAD/month recurring
const PRICE_MAP: Record<string, string | undefined> = {
  starter:  process.env.STRIPE_PRICE_STARTER,
  standard: process.env.STRIPE_PRICE_STANDARD,
  retainer: process.env.STRIPE_PRICE_RETAINER,
};

// Fallback: build a dynamic one-time price if no price ID is configured
const PLAN_AMOUNTS: Record<string, { amount: number; currency: string; mode: "payment" | "subscription"; name: string }> = {
  starter:  { amount: 80000,  currency: "cad", mode: "payment",      name: "Starter Website — 5-page site, mobile-first, live in 5 days" },
  standard: { amount: 180000, currency: "cad", mode: "payment",      name: "Standard Website — up to 10 pages, full SEO, booking forms" },
  retainer: { amount: 20000,  currency: "cad", mode: "subscription", name: "Website Retainer — monthly updates, hosting, SSL, SEO reviews" },
};

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables." },
      { status: 503 }
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

  let plan: string;
  let customerEmail: string | undefined;
  let businessName: string | undefined;
  let previewSlug: string | undefined;

  try {
    const body = await req.json();
    plan = (body.plan || "standard").toLowerCase();
    customerEmail = body.email;
    businessName = body.businessName;
    previewSlug = body.previewSlug;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const planConfig = PLAN_AMOUNTS[plan];
  if (!planConfig) {
    return NextResponse.json({ error: `Unknown plan: ${plan}` }, { status: 400 });
  }

  const origin = req.headers.get("origin") || "https://randybuilds.vercel.app";
  const successUrl = `${origin}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`;
  const cancelUrl = previewSlug
    ? `${origin}/preview/${previewSlug}`
    : `${origin}/pricing`;

  try {
    const priceId = PRICE_MAP[plan];
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (priceId) {
      // Use configured price ID
      sessionParams = {
        mode: planConfig.mode,
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: customerEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          plan,
          business_name: businessName || "",
          preview_slug: previewSlug || "",
        },
        allow_promotion_codes: true,
      };
    } else {
      // Dynamic price (no pre-configured price ID)
      if (planConfig.mode === "subscription") {
        sessionParams = {
          mode: "subscription",
          line_items: [{
            price_data: {
              currency: planConfig.currency,
              product_data: { name: planConfig.name },
              unit_amount: planConfig.amount,
              recurring: { interval: "month" },
            },
            quantity: 1,
          }],
          customer_email: customerEmail,
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { plan, business_name: businessName || "", preview_slug: previewSlug || "" },
          allow_promotion_codes: true,
        };
      } else {
        sessionParams = {
          mode: "payment",
          line_items: [{
            price_data: {
              currency: planConfig.currency,
              product_data: {
                name: planConfig.name,
                description: `Sitecraft / RandyBuilds — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
              },
              unit_amount: planConfig.amount,
            },
            quantity: 1,
          }],
          customer_email: customerEmail,
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { plan, business_name: businessName || "", preview_slug: previewSlug || "" },
          allow_promotion_codes: true,
          payment_method_types: ["card"],
        };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ ok: true, url: session.url, sessionId: session.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe/checkout]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
