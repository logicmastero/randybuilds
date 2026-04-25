import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

// Disable body parsing — Stripe needs raw body for signature verification
export const config = {
  api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  const rawBody = await req.text();

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { plan, business_name, preview_slug } = session.metadata || {};
        const email = session.customer_details?.email || session.customer_email || "";

        console.log(`[stripe] Payment complete — plan=${plan} email=${email} biz="${business_name}"`);

        // Log to Neon — create a lead record for new paying customer
        if (email) {
          const db = getDb();
          await db`
            INSERT INTO leads (
              business_name, email, stage, source, notes, deal_value
            ) VALUES (
              ${business_name || "New Customer"},
              ${email},
              ${"closed"},
              ${"stripe"},
              ${`Plan: ${plan} | Preview: ${preview_slug || "none"} | Stripe session: ${session.id}`},
              ${session.amount_total ? session.amount_total / 100 : null}
            )
            ON CONFLICT DO NOTHING
          `;
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        console.log(`[stripe] Subscription cancelled: ${sub.id}`);
        // Future: update user plan in DB
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.error(`[stripe] Payment failed for: ${invoice.customer_email}`);
        // Future: send dunning email
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error:", err);
    // Return 200 so Stripe doesn't retry — we'll handle manually
  }

  return NextResponse.json({ received: true });
}
