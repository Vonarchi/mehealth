// Sample data for sales demos only. Every name here is fictional.
// Shown with a visible "Sample data" label so nobody mistakes it for real members.

import { buildDailyLog, getDateKey } from "@/lib/daily-log";
import type { PersistedState } from "@/lib/her-reset-persist";
import type { ChecklistState } from "@/lib/her-reset-types";

export type CohortMember = {
  name: string;
  week: number;
  completion: number;
  streak: number;
  fastingRate: number;
  waterRate: number;
  lastCheckIn: string;
};

const FIRST = [
  "Tasha", "Monique", "Keisha", "Angela", "Brittany", "Denise", "Latoya", "Crystal",
  "Jasmine", "Tiffany", "Renee", "Shonda", "Nicole", "Kim", "Aaliyah", "Patrice",
  "Vanessa", "Tamara", "Gina", "Rochelle", "Ebony", "Sharon", "Dana", "Yolanda",
];
const LAST = "MJWBRTCHDLSPGKAN";

// Small deterministic PRNG so the demo looks the same every time it is shown.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return getDateKey(d);
}

export function demoCohort(week = 3): CohortMember[] {
  const rand = mulberry32(2026);
  return FIRST.map((first, i) => {
    const engaged = rand();
    const completion = Math.round(35 + engaged * 62);
    const lastGap = completion < 50 ? 2 + Math.floor(rand() * 3) : Math.floor(rand() * 2);
    return {
      name: `${first} ${LAST[i % LAST.length]}.`,
      week,
      completion,
      streak: completion < 50 ? Math.floor(rand() * 2) : 3 + Math.floor(rand() * 12),
      fastingRate: Math.min(100, Math.round(completion + rand() * 12)),
      waterRate: Math.min(100, Math.round(completion - 8 + rand() * 20)),
      lastCheckIn: daysAgo(lastGap),
    };
  }).sort((a, b) => b.completion - a.completion);
}

/** A member who is two weeks into the program, so every screen has something on it. */
export function demoMemberState(base: PersistedState): PersistedState {
  const rand = mulberry32(42);
  const history = Array.from({ length: 14 }, (_, i) => {
    const date = daysAgo(14 - i);
    const p = 0.55 + rand() * 0.4;
    const checks: ChecklistState = {
      fasting: rand() < p + 0.1,
      water: rand() < p,
      acv: rand() < p,
      mct: rand() < p - 0.15,
      bowl: rand() < p,
      move: rand() < p - 0.05,
      consistent: rand() < p,
    };
    return buildDailyLog(date, checks, checks.water ? 6 : 3 + Math.floor(rand() * 3), checks.move ? 20 + Math.floor(rand() * 15) : 10);
  });

  return {
    ...base,
    lastActiveDate: getDateKey(),
    challengeStartDate: daysAgo(15),
    currentWeek: 3,
    waterCount: 4,
    movementMinutes: 15,
    checks: { fasting: true, water: false, acv: true, mct: false, bowl: true, move: false, consistent: true },
    dailyHistory: history,
    measurementHistory: [
      { date: daysAgo(14), values: { weight: "212", waist: "41", hips: "49", thighs: "", arms: "" } },
      { date: daysAgo(7), values: { weight: "207.4", waist: "40", hips: "48.5", thighs: "", arms: "" } },
    ],
    journalEntries: [
      { date: daysAgo(2), text: "Cravings hit at 9pm but I drank water and went to bed. Proud of that." },
    ],
    feedLikes: { 0: 38, 1: 54, 2: 21, 3: 47 },
    feedCelebrations: { 1: 29, 3: 33 },
    feedComments: { 1: ["You got this sis!", "Same here, week 2 is when it clicked for me."] },
  };
}
