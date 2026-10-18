# MeHealth

A 12-week guided body reset: fasting windows, bowl portions, hydration, movement,
measurements, progress photos, and daily accountability.

Members create an account, start a free week through Stripe, and their progress
saves to their account so it follows them to any device.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the keys below
npm run dev
```

With no Supabase keys the app runs in **local-only mode**: no sign-in, no paywall,
progress saved in the browser. Useful for design work.

## Setup

### 1. Supabase (accounts + cloud sync)

1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/migrations/0001_accounts_and_billing.sql`.
3. Project Settings → API: copy the URL, the publishable key and the secret key into
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`.
4. Authentication → URL Configuration: set the Site URL to your app's URL
   (confirmation and sign-in-link emails point there).

Members can read their own profile but can't change their subscription status; only
the Stripe webhook (using the secret key) writes it.

### 2. Stripe (subscriptions with a free week)

1. Create a Product ("MeHealth Membership") with a recurring monthly Price. Put the
   `price_...` id in `STRIPE_PRICE_ID`, and the secret key in `STRIPE_SECRET_KEY`.
2. Developers → Webhooks → add an endpoint at `https://YOUR-DOMAIN/api/billing/webhook`
   listening for `checkout.session.completed` and
   `customer.subscription.created/updated/deleted`. Put the signing secret in
   `STRIPE_WEBHOOK_SECRET`.
3. Settings → Billing → Customer portal: turn it on (lets members update cards and cancel).
4. Set `NEXT_PUBLIC_PRICE_LABEL` (e.g. `$19.99/month`) so the paywall shows the price.

The first subscription per member gets a `STRIPE_TRIAL_DAYS` free trial (default 7).
Members keep access while `trialing`, `active`, or `past_due` (Stripe is retrying the card).

Local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

### 3. Deploy

Add the same environment variables in Vercel, plus `NEXT_PUBLIC_SITE_URL`
(your production URL), and redeploy.

## How it fits together

| Piece | Where |
| --- | --- |
| Tracker UI | `src/components/her-reset/` |
| Sign-in, paywall, account bar, cloud save | `src/components/app-shell.tsx` |
| Cloud pull/push of program state | `src/lib/cloud-sync.ts` |
| Checkout, billing portal, webhook | `src/app/api/billing/*` |
| Database tables and security rules | `supabase/migrations/` |
