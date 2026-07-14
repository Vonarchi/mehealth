import type { ChecklistState } from "@/lib/her-reset-types";

export type DailyLog = {
  date: string;
  checks: ChecklistState;
  waterCount: number;
  movementMinutes: number;
  completion: number;
};

export type WeeklyWin = {
  text: string;
  earned: boolean;
};

export const defaultChecks: ChecklistState = {
  fasting: false,
  water: false,
  acv: false,
  mct: false,
  bowl: false,
  move: false,
  consistent: false,
};

export function getDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function completionPercent(checks: ChecklistState): number {
  const total = Object.keys(checks).length;
  const complete = Object.values(checks).filter(Boolean).length;
  return Math.round((complete / total) * 100);
}

export function computeChallengeWeek(startDate: string, today = getDateKey()): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${today}T12:00:00`);
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(12, Math.max(1, Math.floor(diffDays / 7) + 1));
}

export function buildDailyLog(
  date: string,
  checks: ChecklistState,
  waterCount: number,
  movementMinutes: number,
): DailyLog {
  return { date, checks, waterCount, movementMinutes, completion: completionPercent(checks) };
}

export function rolloverDay(
  lastActiveDate: string | undefined,
  state: {
    checks: ChecklistState;
    waterCount: number;
    movementMinutes: number;
    bloatingLogged: string[];
    dailyHistory: DailyLog[];
    notes: string;
    journalEntries: Array<{ date: string; text: string }>;
  },
  today = getDateKey(),
): {
  lastActiveDate: string;
  checks: ChecklistState;
  waterCount: number;
  movementMinutes: number;
  bloatingLogged: string[];
  dailyHistory: DailyLog[];
  journalEntries: Array<{ date: string; text: string }>;
  notes: string;
} {
  if (!lastActiveDate || lastActiveDate === today) {
    return {
      lastActiveDate: today,
      checks: state.checks,
      waterCount: state.waterCount,
      movementMinutes: state.movementMinutes,
      bloatingLogged: state.bloatingLogged,
      dailyHistory: state.dailyHistory,
      journalEntries: state.journalEntries,
      notes: state.notes,
    };
  }

  const dailyHistory = [...state.dailyHistory];
  dailyHistory.push(buildDailyLog(lastActiveDate, state.checks, state.waterCount, state.movementMinutes));

  const journalEntries = [...state.journalEntries];
  if (state.notes.trim()) {
    journalEntries.push({ date: lastActiveDate, text: state.notes.trim() });
  }

  return {
    lastActiveDate: today,
    checks: { ...defaultChecks },
    waterCount: 0,
    movementMinutes: 0,
    bloatingLogged: [],
    dailyHistory,
    journalEntries,
    notes: "",
  };
}

function countDaysMatching(logs: DailyLog[], predicate: (log: DailyLog) => boolean): number {
  return logs.filter(predicate).length;
}

function maxWaterStreak(logs: DailyLog[]): number {
  let streak = 0;
  let best = 0;
  for (const log of logs) {
    if (log.waterCount >= 6) {
      streak += 1;
      best = Math.max(best, streak);
    } else {
      streak = 0;
    }
  }
  return best;
}

export function computeWeeklyWins(dailyHistory: DailyLog[], todayLog: DailyLog | null): WeeklyWin[] {
  const recent = [...dailyHistory.slice(-6), ...(todayLog ? [todayLog] : [])];

  const fastingDays = countDaysMatching(recent, (log) => log.checks.fasting);
  const waterStreak = maxWaterStreak(recent);
  const movementDays = countDaysMatching(recent, (log) => log.checks.move || log.movementMinutes >= 20);
  const bowlDays = countDaysMatching(recent, (log) => log.checks.bowl);

  return [
    { text: "Hit fasting window 5 days this week", earned: fastingDays >= 5 },
    { text: "Reached water goal 4 days in a row", earned: waterStreak >= 4 },
    { text: "Completed movement target 3 times", earned: movementDays >= 3 },
    { text: "Stayed on bowl plan for all main meals", earned: bowlDays >= 5 },
  ];
}
