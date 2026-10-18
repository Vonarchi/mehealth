import { getUserFromRequest } from "@/lib/server/supabase-admin";
import { appOrigin, getOrCreateCustomer, getStripe } from "@/lib/server/stripe";

/** Opens Stripe's hosted billing portal so members can update cards or cancel. */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ error: "Please sign in first." }, { status: 401 });

    const customerId = await getOrCreateCustomer(user.id, user.email);
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appOrigin(request)}/`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("portal error", error);
    return Response.json({ error: "Could not open billing. Please try again." }, { status: 500 });
  }
}
