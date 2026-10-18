"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { CircleCheckBig, Loader2, LogOut, Mail, ShieldCheck, Sparkles, CreditCard } from "lucide-react";
import { HerResetApp } from "@/components/her-reset/her-reset-app";
import { Button, Card, CardContent, Input, Label } from "@/components/her-reset/ui";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase-browser";
import { forgetLocalState, pullCloudState, pushCloudState } from "@/lib/cloud-sync";
import type { PersistedState } from "@/lib/her-reset-persist";

type Profile = {
  subscription_status: string;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

/** Statuses that unlock the program. past_due keeps access while Stripe retries the card. */
const ACCESS_STATUSES = new Set(["trialing", "active", "past_due"]);
const PAYWALL_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_ENABLED !== "false";
const PRICE_LABEL = process.env.NEXT_PUBLIC_PRICE_LABEL;
const SAVE_DELAY_MS = 1500;

export function AppShell() {
  if (!isSupabaseConfigured) {
    // No keys yet: run the tracker exactly as before, saved in this browser only.
    return <HerResetApp />;
  }
  return <AccountGate />;
}

function AccountGate() {
  const supabase = getSupabaseBrowser()!;
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  // Profile + cloud sync result for one account; ignored once a different account signs in.
  const [account, setAccount] = useState<{ userId: string; profile: Profile } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const userId = session?.user.id ?? null;
  const profile = account && account.userId === userId ? account.profile : null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  // Load profile + cloud progress whenever the signed-in account changes.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetchProfile = async (): Promise<Profile> => {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_status, trial_end, current_period_end, cancel_at_period_end")
        .eq("id", userId)
        .maybeSingle();
      return (data as Profile | null) ?? { subscription_status: "none", trial_end: null, current_period_end: null, cancel_at_period_end: false };
    };

    (async () => {
      let current = await fetchProfile();
      // Right after checkout the webhook may still be on its way; poll briefly.
      if (new URLSearchParams(window.location.search).get("checkout") === "success") {
        for (let i = 0; i < 8 && !cancelled && !ACCESS_STATUSES.has(current.subscription_status); i++) {
          await new Promise((r) => setTimeout(r, 1500));
          current = await fetchProfile();
        }
        window.history.replaceState(null, "", window.location.pathname);
      }
      let error: string | null = null;
      try {
        await pullCloudState(supabase, userId);
      } catch {
        error = "Couldn't load your saved progress. Changes are kept on this device for now.";
      }
      if (!cancelled) {
        setSyncError(error);
        setAccount({ userId, profile: current });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  // Debounced cloud save of every change the tracker reports.
  const pending = useRef<PersistedState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const state = pending.current;
    pending.current = null;
    if (!state || !userId) return;
    await pushCloudState(supabase, userId, state)
      .then(() => setSyncError(null))
      .catch(() => setSyncError("Couldn't save to your account. We'll keep trying as you make changes."));
  }, [supabase, userId]);

  const onStateChange = useCallback(
    (state: PersistedState) => {
      pending.current = state;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flush]);

  const signOut = async () => {
    await flush();
    await supabase.auth.signOut();
    forgetLocalState();
  };

  if (!authReady || (session && !profile)) return <FullScreenLoader />;
  if (!session) return <AuthScreen />;

  const hasAccess = !PAYWALL_ENABLED || ACCESS_STATUSES.has(profile!.subscription_status);
  if (!hasAccess) return <Paywall session={session} onSignOut={signOut} returning={profile!.subscription_status !== "none"} />;

  return (
    <>
      <AccountBar session={session} profile={profile!} syncError={syncError} onSignOut={signOut} />
      <HerResetApp onStateChange={onStateChange} />
    </>
  );
}

async function openBilling(session: Session, path: "checkout" | "portal"): Promise<string | null> {
  const res = await fetch(`/api/billing/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (res.ok && body.url) {
    window.location.href = body.url;
    return null;
  }
  return body.error ?? "Something went wrong. Please try again.";
}

function formatDate(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
}

function AccountBar({
  session,
  profile,
  syncError,
  onSignOut,
}: {
  session: Session;
  profile: Profile;
  syncError: string | null;
  onSignOut: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let status: string | null = null;
  if (profile.subscription_status === "trialing") status = `Free week ends ${formatDate(profile.trial_end)}`;
  else if (profile.subscription_status === "past_due") status = "Payment issue — update your card to keep access";
  else if (profile.cancel_at_period_end) status = `Access ends ${formatDate(profile.current_period_end)}`;

  return (
    <div className="bg-slate-900 text-white text-xs md:text-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="truncate opacity-80">{session.user.email}</span>
        {status && <span className="text-fuchsia-200">{status}</span>}
        {(syncError || error) && <span className="text-amber-300">{syncError ?? error}</span>}
        <span className="flex-1" />
        {PAYWALL_ENABLED && profile.subscription_status !== "none" && (
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center gap-1 opacity-80 hover:opacity-100 disabled:opacity-50"
            onClick={async () => {
              setBusy(true);
              setError(await openBilling(session, "portal"));
              setBusy(false);
            }}
          >
            <CreditCard className="h-3.5 w-3.5" /> Billing
          </button>
        )}
        <button type="button" className="inline-flex items-center gap-1 opacity-80 hover:opacity-100" onClick={onSignOut}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-fuchsia-50 to-violet-100 p-4 md:p-8 flex items-center justify-center">
      {children}
    </div>
  );
}

function FullScreenLoader() {
  return (
    <Backdrop>
      <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" aria-label="Loading" />
    </Backdrop>
  );
}

function AuthScreen() {
  const supabase = getSupabaseBrowser()!;
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMessage({ kind: "error", text: error.message });
      else if (!data.session) setMessage({ kind: "info", text: "Check your email to confirm your account, then come back and sign in." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ kind: "error", text: error.message });
    }
    setBusy(false);
  };

  const sendLink = async () => {
    if (!email) {
      setMessage({ kind: "error", text: "Enter your email first." });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    });
    setMessage(error ? { kind: "error", text: error.message } : { kind: "info", text: "We emailed you a sign-in link." });
    setBusy(false);
  };

  return (
    <Backdrop>
      <Card className="w-full max-w-md bg-white/90 backdrop-blur border-0 shadow-xl rounded-[2rem]">
        <CardContent className="p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-600">MeHealth · 12-Week Body Reset</p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === "signup"
              ? "Your progress saves to your account, so it follows you to any phone or computer."
              : "Sign in to pick up where you left off."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            {message && (
              <p className={`text-sm ${message.kind === "error" ? "text-rose-600" : "text-emerald-700"}`}>{message.text}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-2xl bg-fuchsia-600 text-white font-medium hover:bg-fuchsia-700 disabled:opacity-60"
            >
              {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" className="text-fuchsia-700 hover:underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
              {mode === "signup" ? "Already a member? Sign in" : "New here? Create an account"}
            </button>
            {mode === "signin" && (
              <button type="button" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800" onClick={sendLink}>
                <Mail className="h-3.5 w-3.5" /> Email me a sign-in link
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </Backdrop>
  );
}

function Paywall({ session, onSignOut, returning }: { session: Session; onSignOut: () => void; returning: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outcomes = [
    "A daily checklist that tells you exactly what to do",
    "Fasting timer, bowl portions, and simple meal structure",
    "Measurements, photos, and weekly wins to see your progress",
    "Coach-led accountability so week 2 isn't where you quit",
  ];

  return (
    <Backdrop>
      <Card className="w-full max-w-lg bg-white/90 backdrop-blur border-0 shadow-xl rounded-[2rem] overflow-hidden">
        <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-500 text-white p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">12-Week Guided Body Reset</p>
          <h1 className="text-3xl font-semibold mt-2 leading-tight">
            {returning ? "Pick up your reset where you left off." : "Twelve weeks from now, you'll be glad you started today."}
          </h1>
          <p className="text-white/85 text-sm mt-3">
            Most plans fail by week two because nobody is holding you to them. MeHealth gives you the structure and the
            accountability to stay consistent.
          </p>
        </div>
        <CardContent className="p-8">
          <ul className="space-y-3">
            {outcomes.map((o) => (
              <li key={o} className="flex gap-3 text-sm text-slate-700">
                <CircleCheckBig className="h-5 w-5 text-fuchsia-600 shrink-0" /> {o}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-2xl bg-fuchsia-50 p-4 flex gap-3 text-sm text-slate-700">
            <ShieldCheck className="h-5 w-5 text-fuchsia-600 shrink-0" />
            <span>
              {returning ? (
                "Restart your membership any time. Cancel in one click from Billing."
              ) : (
                <>
                  <strong>Your first week is free.</strong> Cancel before day 7 and you pay nothing.
                  {PRICE_LABEL ? ` After that, ${PRICE_LABEL}.` : ""}
                </>
              )}
            </span>
          </div>

          {error && <p className="text-sm text-rose-600 mt-4">{error}</p>}

          <Button
            disabled={busy}
            className="w-full h-12 mt-6 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-700 text-base"
            onClick={async () => {
              setBusy(true);
              setError(await openBilling(session, "checkout"));
              setBusy(false);
            }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {busy ? "Opening checkout…" : returning ? "Restart my membership" : "Start my free week"}
          </Button>

          <p className="text-xs text-slate-500 mt-4 text-center">
            Signed in as {session.user.email} ·{" "}
            <button type="button" className="underline" onClick={onSignOut}>
              Sign out
            </button>
          </p>
        </CardContent>
      </Card>
    </Backdrop>
  );
}
