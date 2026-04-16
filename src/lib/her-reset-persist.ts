import type { ChecklistState, TabId } from "@/lib/her-reset-types";

const STORAGE_KEY = "her-reset-app-v1";

export type PersistedState = {
  v: 1;
  activeTab: TabId;
  currentWeek: number;
  fastStart: string;
  fastEnd: string;
  waterCount: number;
  movementMinutes: number;
  notes: string;
  measurements: Record<string, string>;
  checks: ChecklistState;
  bloatingLogged: string[];
  feedLikes: Record<number, number>;
  photoMeta: Array<{ name: string; size: number; savedAt: string }>;
};

export function loadPersisted(): Partial<PersistedState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedState;
    if (data?.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function savePersisted(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota or private mode
  }
}
