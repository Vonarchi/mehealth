import type Stripe from "stripe";
import { getStripe, syncSubscriptionToProfile } from "@/lib/server/stripe";

/**
 * Stripe webhook. Keeps each member's subscription status in Supabase current.
 * Point a Stripe webhook endpoint at /api/billing/webhook with these events:
 *   checkout.session.completed
 *   customer.subscription.created / updated / deleted
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return Response.json({ error: "Webhook not configured." }, { status: 400 });
  }

  const stripe = getStripe();
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    console.error("webhook signature failed", error);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionToProfile(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscriptionToProfile(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`webhook handler failed for ${event.type}`, error);
    // A 500 makes Stripe retry, so a temporary database error doesn't lose the update.
    return Response.json({ error: "Handler failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
