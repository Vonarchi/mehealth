import { getUserFromRequest } from "@/lib/server/supabase-admin";
import { appOrigin, getOrCreateCustomer, getStripe, TRIAL_DAYS } from "@/lib/server/stripe";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ error: "Please sign in first." }, { status: 401 });

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) return Response.json({ error: "Billing is not set up yet." }, { status: 503 });

    const stripe = getStripe();
    const customerId = await getOrCreateCustomer(user.id, user.email);

    // Only the first subscription gets the free trial.
    const previous = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
    const trialEligible = previous.data.length === 0 && TRIAL_DAYS > 0;

    const origin = appOrigin(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
        ...(trialEligible ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=canceled`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("checkout error", error);
    return Response.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
