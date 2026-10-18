"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { clearPersisted, loadPersisted, savePersisted, type PersistedState } from "@/lib/her-reset-persist";

/** Which account the progress currently cached in this browser belongs to. */
const OWNER_KEY = "mehealth-owner";

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // storage unavailable
  }
}

/**
 * Runs once after sign-in, before the tracker mounts.
 * - Cloud copy exists: it wins and is written to this browser.
 * - No cloud copy: progress made in this browser before accounts existed is
 *   uploaded, so early members don't lose their history.
 * - Progress cached for a different account is never uploaded.
 */
export async function pullCloudState(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("app_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  const owner = readOwner();
  if (data?.state && (data.state as PersistedState).v === 2) {
    savePersisted(data.state as PersistedState);
    writeOwner(userId);
    return;
  }

  const local = owner === null || owner === userId ? loadPersisted() : null;
  if (!local) clearPersisted();
  writeOwner(userId);
  if (local) await pushCloudState(supabase, userId, local);
}

export async function pushCloudState(
  supabase: SupabaseClient,
  userId: string,
  state: PersistedState,
): Promise<void> {
  const { error } = await supabase
    .from("app_state")
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Clears this browser's cached progress so the next person on the device starts clean. */
export function forgetLocalState(): void {
  clearPersisted();
  writeOwner(null);
}
