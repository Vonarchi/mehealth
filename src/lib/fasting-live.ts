import { parseTimeToMinutes } from "@/lib/fasting-window";

export type FastingPhase = "eating" | "fasting";

export function getFastingPhase(fastEnd: string, fastStart: string, now = new Date()): FastingPhase | null {
  const endM = parseTimeToMinutes(fastEnd);
  const startM = parseTimeToMinutes(fastStart);
  if (endM === null || startM === null) return null;

  const nowM = now.getHours() * 60 + now.getMinutes();

  if (endM < startM) {
    return nowM >= endM && nowM < startM ? "eating" : "fasting";
  }

  return nowM >= endM || nowM < startM ? "eating" : "fasting";
}

/** Minutes remaining in the current fasting or eating phase. */
export function getMinutesUntilPhaseEnd(fastEnd: string, fastStart: string, now = new Date()): number | null {
  const phase = getFastingPhase(fastEnd, fastStart, now);
  const endM = parseTimeToMinutes(fastEnd);
  const startM = parseTimeToMinutes(fastStart);
  if (phase === null || endM === null || startM === null) return null;

  const nowM = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  if (phase === "eating") {
    if (endM < startM) return Math.max(0, startM - nowM);
    return nowM >= endM ? Math.max(0, 24 * 60 - nowM + startM) : Math.max(0, startM - nowM);
  }

  if (endM < startM) {
    return nowM < endM ? Math.max(0, endM - nowM) : Math.max(0, 24 * 60 - nowM + endM);
  }

  return Math.max(0, 24 * 60 - nowM + endM);
}

export function formatCountdown(totalMinutes: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMinutes * 60));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
