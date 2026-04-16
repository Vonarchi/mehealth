/** Parse "HH:mm" to minutes from midnight. */
export function parseTimeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Eating window: from fastEnd (eating opens) to fastStart (fast begins), on a 24h loop.
 * Example: fastEnd 12:00, fastStart 20:00 → 8h eating, 16h fasting.
 */
export function eatingWindowMinutes(fastEnd: string, fastStart: string): number | null {
  const endM = parseTimeToMinutes(fastEnd);
  const startM = parseTimeToMinutes(fastStart);
  if (endM === null || startM === null) return null;
  if (endM < startM) return startM - endM;
  return 24 * 60 - endM + startM;
}

export function fastingWindowMinutes(fastEnd: string, fastStart: string): number | null {
  const eat = eatingWindowMinutes(fastEnd, fastStart);
  if (eat === null) return null;
  return 24 * 60 - eat;
}

/** Display like "16:00" for 16h 0m fast (hours : minutes of the fast). */
export function formatDurationClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
