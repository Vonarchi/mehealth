import type { DailyLog } from "@/lib/daily-log";
import type { ChecklistState, TabId } from "@/lib/her-reset-types";

const STORAGE_KEY = "mehealth-app-v2";
const LEGACY_KEY = "her-reset-app-v1";

export type MeasurementEntry = {
  date: string;
  values: Record<string, string>;
};

export type PersistedState = {
  v: 2;
  lastActiveDate: string;
  challengeStartDate: string;
  activeTab: TabId;
  currentWeek: number;
  fastStart: string;
  fastEnd: string;
  waterCount: number;
  movementMinutes: number;
  movementTarget: number;
  notes: string;
  measurements: Record<string, string>;
  checks: ChecklistState;
  bloatingLogged: string[];
  feedLikes: Record<number, number>;
  feedComments: Record<number, string[]>;
  feedCelebrations: Record<number, number>;
  photoMeta: Array<{ name: string; size: number; savedAt: string }>;
  dailyHistory: DailyLog[];
  measurementHistory: MeasurementEntry[];
  journalEntries: Array<{ date: string; text: string }>;
  weeklyResetChecks: Record<string, boolean>;
  remindersEnabled: boolean;
};

type LegacyState = {
  v: 1;
  activeTab?: TabId;
  currentWeek?: number;
  fastStart?: string;
  fastEnd?: string;
  waterCount?: number;
  movementMinutes?: number;
  notes?: string;
  measurements?: Record<string, string>;
  checks?: ChecklistState;
  bloatingLogged?: string[];
  feedLikes?: Record<number, number>;
  photoMeta?: Array<{ name: string; size: number; savedAt: string }>;
};

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultState(): PersistedState {
  const today = todayKey();
  return {
    v: 2,
    lastActiveDate: today,
    challengeStartDate: today,
    activeTab: "dashboard",
    currentWeek: 1,
    fastStart: "20:00",
    fastEnd: "12:00",
    waterCount: 0,
    movementMinutes: 0,
    movementTarget: 20,
    notes: "",
    measurements: { weight: "", waist: "", hips: "", thighs: "", arms: "" },
    checks: {
      fasting: false,
      water: false,
      acv: false,
      mct: false,
      bowl: false,
      move: false,
      consistent: false,
    },
    bloatingLogged: [],
    feedLikes: {},
    feedComments: {},
    feedCelebrations: {},
    photoMeta: [],
    dailyHistory: [],
    measurementHistory: [],
    journalEntries: [],
    weeklyResetChecks: {},
    remindersEnabled: false,
  };
}

function migrateLegacy(raw: LegacyState): PersistedState {
  const base = defaultState();
  return {
    ...base,
    activeTab: raw.activeTab ?? base.activeTab,
    currentWeek: raw.currentWeek ?? base.currentWeek,
    fastStart: raw.fastStart ?? base.fastStart,
    fastEnd: raw.fastEnd ?? base.fastEnd,
    waterCount: raw.waterCount ?? base.waterCount,
    movementMinutes: raw.movementMinutes ?? base.movementMinutes,
    movementTarget: raw.movementMinutes ?? base.movementTarget,
    notes: raw.notes ?? base.notes,
    measurements: { ...base.measurements, ...raw.measurements },
    checks: { ...base.checks, ...raw.checks },
    bloatingLogged: raw.bloatingLogged ?? base.bloatingLogged,
    feedLikes: raw.feedLikes ?? base.feedLikes,
    photoMeta: raw.photoMeta ?? base.photoMeta,
  };
}

export function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as PersistedState;
      if (data?.v === 2) return data;
    }

    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as LegacyState;
      if (legacy?.v === 1) return migrateLegacy(legacy);
    }

    return null;
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

export function clearPersisted(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
}

export { defaultState };
