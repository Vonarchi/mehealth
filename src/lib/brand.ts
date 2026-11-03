// Brand presets. Each coach/creator who licenses the app gets a preset here.
// The "hive" preset uses placeholder names only. Swap in the client's real
// name, coach name and logo AFTER they approve use of their brand.

export type BrandId = "mehealth" | "hive";

export type Brand = {
  id: BrandId;
  appName: string;
  badge: string;
  tagline: string;
  coachName: string;
  /** Extra class on the app root that switches the color theme (see globals.css). */
  themeClass: string;
  /** Hero card background. */
  heroClass: string;
  /** localStorage key so demo data never mixes with a real member's data. */
  storageKey: string;
};

export const brands: Record<BrandId, Brand> = {
  mehealth: {
    id: "mehealth",
    appName: "MeHealth Accountability",
    badge: "12-Week Guided Body Reset",
    tagline:
      "A guided body reset platform built around fasting windows, bowl-based portioning, hydration, movement, measurements, progress photos, and coach-led daily accountability.",
    coachName: "Your Coach",
    themeClass: "",
    heroClass: "bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-500",
    storageKey: "mehealth-app-v2",
  },
  hive: {
    id: "hive",
    appName: "Hive Reset",
    badge: "12-Week Guided Body Reset",
    tagline:
      "Your coach's program in your pocket: fasting windows, the bowl method, ACV, water, movement, check-ins, and a community that keeps you showing up.",
    coachName: "Your Coach",
    themeClass: "theme-hive",
    heroClass: "bg-[radial-gradient(ellipse_at_top_right,#ff2d95_0%,#7a0a4a_45%,#0b0709_100%)]",
    storageKey: "mehealth-demo-hive-v1",
  },
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
