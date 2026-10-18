import "server-only";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured: set STRIPE_SECRET_KEY.");
  if (!stripe) stripe = new Stripe(secretKey);
  return stripe;
}

export const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS ?? 7);

export function appOrigin(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
}

/** Returns the member's Stripe customer id, creating the customer the first time. */
export async function getOrCreateCustomer(userId: string, email: string | undefined): Promise<string> {
  const db = getSupabaseAdmin();
  const { data: profile, error } = await db
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (profile?.stripe_customer_id) return profile.stripe_customer_id as string;

  const customer = await getStripe().customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  const { error: upsertError } = await db
    .from("profiles")
    .upsert({ id: userId, email, stripe_customer_id: customer.id, updated_at: new Date().toISOString() });
  if (upsertError) throw upsertError;

  return customer.id;
}

function toIso(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/** Copies a Stripe subscription onto the member's profile row. */
export async function syncSubscriptionToProfile(subscription: Stripe.Subscription): Promise<void> {
  const db = getSupabaseAdmin();
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  // Billing periods live on subscription items in current Stripe API versions.
  const periodEnd = subscription.items.data.reduce<number | null>((latest, item) => {
    const end = item.current_period_end;
    return latest === null || end > latest ? end : latest;
  }, null);

  const fields = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    trial_end: toIso(subscription.trial_end),
    current_period_end: toIso(periodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  const userId = subscription.metadata?.supabase_user_id;
  const query = userId
    ? db.from("profiles").update(fields).eq("id", userId)
    : db.from("profiles").update(fields).eq("stripe_customer_id", customerId);

  const { error } = await query;
  if (error) throw error;
}
