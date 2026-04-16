"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  Droplets,
  HeartPulse,
  Moon,
  NotebookPen,
  Salad,
  Sparkles,
  TimerReset,
  Trophy,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { formatDurationClock, fastingWindowMinutes } from "@/lib/fasting-window";
import { loadPersisted, savePersisted, type PersistedState } from "@/lib/her-reset-persist";
import type { ChecklistState, TabId } from "@/lib/her-reset-types";

const TAB_IDS: TabId[] = ["dashboard", "fasting", "meals", "progress", "community", "coach"];

function isTabId(value: unknown): value is TabId {
  return typeof value === "string" && (TAB_IDS as string[]).includes(value);
}
import {
  approvedFastedItems,
  bloatingTriggers,
  challengeWeeks,
  dailyChecklistSeed,
  feedPosts,
  mealIdeas,
} from "@/components/her-reset/data";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Progress,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/her-reset/ui";

const defaultChecks: ChecklistState = {
  fasting: true,
  water: false,
  acv: true,
  mct: false,
  bowl: true,
  move: true,
  consistent: false,
};

const defaultMeasurements = {
  weight: "",
  waist: "",
  hips: "",
  thighs: "",
  arms: "",
};

function StatCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-3xl shadow-sm border-0 bg-white/80 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{helper}</p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-pink-100 flex items-center justify-center">
            <Icon className="h-5 w-5 text-pink-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-2xl bg-pink-100 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-pink-600" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

export function HerResetApp() {
  const checklistAnchorRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fastWindowFieldsRef = useRef<HTMLDivElement>(null);
  const fastStartInputRef = useRef<HTMLInputElement>(null);

  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [currentWeek, setCurrentWeek] = useState(1);
  const [fastStart, setFastStart] = useState("20:00");
  const [fastEnd, setFastEnd] = useState("12:00");
  const [waterCount, setWaterCount] = useState(3);
  const [movementMinutes, setMovementMinutes] = useState(20);
  const [notes, setNotes] = useState("");
  const [measurements, setMeasurements] = useState(defaultMeasurements);
  const [checks, setChecks] = useState<ChecklistState>(defaultChecks);
  const [bloatingLogged, setBloatingLogged] = useState<string[]>([]);
  const [feedLikes, setFeedLikes] = useState<Record<number, number>>({});
  const [photoMeta, setPhotoMeta] = useState<Array<{ name: string; size: number; savedAt: string }>>([]);

  useEffect(() => {
    const p = loadPersisted();
    startTransition(() => {
      if (p) {
        if (isTabId(p.activeTab)) setActiveTab(p.activeTab);
        if (typeof p.currentWeek === "number") setCurrentWeek(p.currentWeek);
        if (typeof p.fastStart === "string") setFastStart(p.fastStart);
        if (typeof p.fastEnd === "string") setFastEnd(p.fastEnd);
        if (typeof p.waterCount === "number") setWaterCount(p.waterCount);
        if (typeof p.movementMinutes === "number") setMovementMinutes(p.movementMinutes);
        if (typeof p.notes === "string") setNotes(p.notes);
        if (p.measurements && typeof p.measurements === "object") setMeasurements({ ...defaultMeasurements, ...p.measurements });
        if (p.checks && typeof p.checks === "object") setChecks({ ...defaultChecks, ...p.checks });
        if (Array.isArray(p.bloatingLogged)) setBloatingLogged(p.bloatingLogged);
        if (p.feedLikes && typeof p.feedLikes === "object") setFeedLikes(p.feedLikes);
        if (Array.isArray(p.photoMeta)) setPhotoMeta(p.photoMeta);
      }
      setHydrated(true);
    });
  }, []);

  const persistSnapshot = useCallback((): PersistedState => {
    return {
      v: 1,
      activeTab,
      currentWeek,
      fastStart,
      fastEnd,
      waterCount,
      movementMinutes,
      notes,
      measurements,
      checks,
      bloatingLogged,
      feedLikes,
      photoMeta,
    };
  }, [
    activeTab,
    bloatingLogged,
    checks,
    currentWeek,
    fastEnd,
    fastStart,
    feedLikes,
    measurements,
    movementMinutes,
    notes,
    photoMeta,
    waterCount,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    savePersisted(persistSnapshot());
  }, [hydrated, persistSnapshot]);

  const bowlSize = currentWeek <= 6 ? "32 oz bowl" : "24 oz bowl";

  const completion = useMemo(() => {
    const total = Object.keys(checks).length;
    const complete = Object.values(checks).filter(Boolean).length;
    return Math.round((complete / total) * 100);
  }, [checks]);

  const setBottleCount = (n: number) => {
    setWaterCount(n);
    if (n >= 6) setChecks((prev) => ({ ...prev, water: true }));
  };

  const fastingMinutes = useMemo(() => fastingWindowMinutes(fastEnd, fastStart), [fastEnd, fastStart]);
  const targetFastDisplay = fastingMinutes !== null ? formatDurationClock(fastingMinutes) : "—";

  const handleMeasurement = (key: keyof typeof measurements, value: string) => {
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  const applyEatingPreset = (eatOpen: string, eatClose: string) => {
    setFastEnd(eatOpen);
    setFastStart(eatClose);
  };

  const toggleBloating = (trigger: string) => {
    setBloatingLogged((prev) => (prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]));
  };

  const bumpLike = (idx: number) => {
    setFeedLikes((prev) => ({ ...prev, [idx]: (prev[idx] ?? 0) + 1 }));
  };

  const onPhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const now = new Date().toISOString();
    const next = [...photoMeta];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      next.push({ name: f.name, size: f.size, savedAt: now });
    }
    setPhotoMeta(next);
    e.target.value = "";
  };

  const startToday = () => {
    setActiveTab("dashboard");
    requestAnimationFrame(() => {
      checklistAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-fuchsia-50 to-violet-100 p-4 md:p-8">
      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPhotosSelected} />

      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <Card className="border-0 rounded-[2rem] overflow-hidden shadow-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-500 text-white">
            <CardContent className="p-6 md:p-8">
              <div className="grid md:grid-cols-[1.4fr_.9fr] gap-6 items-center">
                <div>
                  <Badge className="bg-white/15 text-white border border-white/20 rounded-full px-4 py-1 mb-4">
                    12-Week Guided Body Reset
                  </Badge>
                  <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">Her Reset Accountability App</h1>
                  <p className="text-white/85 mt-3 max-w-2xl text-sm md:text-base">
                    A women&apos;s transformation platform built around fasting windows, bowl-based portioning, hydration, movement,
                    measurements, progress photos, and coach-led daily accountability.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-5">
                    <Button onClick={startToday} className="rounded-2xl bg-white text-fuchsia-700 hover:bg-white/90">
                      Start Today <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setActiveTab("community")}
                      className="rounded-2xl bg-white/15 text-white hover:bg-white/20 border-0"
                    >
                      Join Community
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard title="Current week" value={`Week ${currentWeek}`} helper={bowlSize} icon={Trophy} />
                  <StatCard title="Daily score" value={`${completion}%`} helper="Checklist completion" icon={Sparkles} />
                  <StatCard title="Water" value={`${waterCount}/6`} helper="Bottle goal" icon={Droplets} />
                  <StatCard title="Movement" value={`${movementMinutes} min`} helper="Today&apos;s activity" icon={HeartPulse} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs>
          <TabsList className="grid grid-cols-2 md:grid-cols-6 rounded-3xl p-1 bg-white shadow-sm h-auto mb-6">
            <TabsTrigger active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")}>
              Dashboard
            </TabsTrigger>
            <TabsTrigger active={activeTab === "fasting"} onClick={() => setActiveTab("fasting")}>
              Fasting
            </TabsTrigger>
            <TabsTrigger active={activeTab === "meals"} onClick={() => setActiveTab("meals")}>
              Meals
            </TabsTrigger>
            <TabsTrigger active={activeTab === "progress"} onClick={() => setActiveTab("progress")}>
              Progress
            </TabsTrigger>
            <TabsTrigger active={activeTab === "community"} onClick={() => setActiveTab("community")}>
              Community
            </TabsTrigger>
            <TabsTrigger active={activeTab === "coach"} onClick={() => setActiveTab("coach")}>
              Coach Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent active={activeTab === "dashboard"}>
            <div ref={checklistAnchorRef} className="grid lg:grid-cols-[1.2fr_.8fr] gap-6">
              <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                <CardHeader>
                  <SectionTitle
                    icon={CircleCheckBig}
                    title="Today&apos;s success checklist"
                    subtitle="Simple daily actions that keep members accountable."
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  {dailyChecklistSeed.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-pink-100 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-pink-600" />
                          </div>
                          <span className="text-sm md:text-base font-medium text-slate-800">{item.label}</span>
                        </div>
                        <Checkbox
                          checked={checks[item.id]}
                          onCheckedChange={(value) =>
                            setChecks((prev) => ({ ...prev, [item.id]: value } as ChecklistState))
                          }
                        />
                      </div>
                    );
                  })}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Daily completion</span>
                      <span className="text-sm text-slate-500">{completion}%</span>
                    </div>
                    <Progress value={completion} className="h-3 rounded-full" />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                  <CardHeader>
                    <SectionTitle icon={Droplets} title="Water tracker" subtitle="Daily minimum target: 6 bottles." />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setBottleCount(n)}
                          className={`rounded-2xl p-4 border text-sm font-medium transition ${
                            n <= waterCount ? "bg-pink-600 text-white border-pink-600" : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          Bottle {n}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-slate-500">
                      The app can send reminders throughout the day and convert this into streaks, badges, and coach alerts.
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                  <CardHeader>
                    <SectionTitle icon={TimerReset} title="Challenge logic" subtitle="Program progression tied to the 12-week plan." />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Label>Current challenge week</Label>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {challengeWeeks.map((week) => (
                        <button
                          key={week}
                          type="button"
                          onClick={() => setCurrentWeek(week)}
                          className={`rounded-2xl py-3 text-sm font-medium border ${
                            week === currentWeek
                              ? "bg-fuchsia-600 text-white border-fuchsia-600"
                              : "bg-white text-slate-700 border-slate-200"
                          }`}
                        >
                          {week}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-2xl bg-rose-50 p-4">
                      <p className="font-medium text-slate-900">Current bowl guidance</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {currentWeek <= 6
                          ? "First 6 weeks: use a 32 oz bowl to build structured, disciplined meals."
                          : "Last 6 weeks: switch to a 24 oz bowl to tighten portions and level up discipline."}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                  <CardHeader>
                    <SectionTitle icon={HeartPulse} title="Movement" subtitle="Adjust today&apos;s activity target." />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <input
                      type="range"
                      min={0}
                      max={120}
                      step={5}
                      value={movementMinutes}
                      onChange={(e) => setMovementMinutes(Number(e.target.value))}
                      className="w-full accent-fuchsia-600"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>0 min</span>
                      <span>120 min</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent active={activeTab === "fasting"}>
            <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
              <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                <CardHeader>
                  <SectionTitle
                    icon={Clock3}
                    title="Fasting timer and eating window"
                    subtitle="Users choose a lifestyle-friendly window like 10–6 or 12–8."
                  />
                </CardHeader>
                <CardContent className="space-y-5">
                  <div ref={fastWindowFieldsRef} id="fast-window-custom" className="grid md:grid-cols-2 gap-4 scroll-mt-24">
                    <div className="space-y-2">
                      <Label>Fast starts</Label>
                      <Input
                        ref={fastStartInputRef}
                        value={fastStart}
                        onChange={(e) => setFastStart(e.target.value)}
                        type="time"
                        className="rounded-2xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fast ends / eating window opens</Label>
                      <Input value={fastEnd} onChange={(e) => setFastEnd(e.target.value)} type="time" className="rounded-2xl h-12" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    <Button variant="outline" className="rounded-2xl" onClick={() => applyEatingPreset("10:00", "18:00")}>
                      10 AM – 6 PM
                    </Button>
                    <Button variant="outline" className="rounded-2xl" onClick={() => applyEatingPreset("12:00", "20:00")}>
                      12 PM – 8 PM
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        fastWindowFieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        requestAnimationFrame(() => fastStartInputRef.current?.focus());
                      }}
                    >
                      Custom window
                    </Button>
                  </div>

                  <div className="rounded-[1.5rem] bg-slate-950 text-white p-6">
                    <p className="text-sm text-white/70">Fasting status</p>
                    <div className="flex items-end gap-3 mt-2">
                      <span className="text-4xl font-semibold">{targetFastDisplay}</span>
                      <span className="text-white/70 pb-1">target fast</span>
                    </div>
                    <p className="text-sm text-white/75 mt-2">
                      Start: {fastStart} · Eat again: {fastEnd} · Monday–Saturday plan
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
                    <p className="font-medium text-slate-900">Optional reminders</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Push notifications can remind users when to start fasting, hydrate, take ACV, and close the eating window.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                <CardHeader>
                  <SectionTitle icon={Moon} title="Approved during the fasted window" subtitle="Clean guidance inside the fasting timer screen." />
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  {approvedFastedItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-2xl border border-slate-100 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-emerald-700" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-500">{item.subtitle}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600">{item.detail}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent active={activeTab === "meals"}>
            <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
              <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                <CardHeader>
                  <SectionTitle icon={UtensilsCrossed} title="Meal structure engine" subtitle="This app is meal-guided, not macro-obsessed." />
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-2xl bg-pink-50 p-4">
                    <p className="font-medium text-slate-900">Break your fast</p>
                    <p className="text-sm text-slate-600 mt-1">Protein first. Keep it simple.</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {mealIdeas.breakFast.map((item) => (
                        <Badge key={item} className="rounded-full px-3 py-1 bg-white text-slate-700 border border-slate-100">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-violet-50 p-4">
                    <p className="font-medium text-slate-900">Main bowl meal</p>
                    <p className="text-sm text-slate-600 mt-1">Build meals around {bowlSize} guidance.</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc pl-5">
                      <li>Protein</li>
                      <li>Vegetables</li>
                      <li>Healthy carbs earlier in the day</li>
                      <li>ACV + MCT oil as optional protocol tools</li>
                    </ul>
                    <div className="grid sm:grid-cols-2 gap-2 mt-4">
                      {mealIdeas.lunchBowls.map((meal) => (
                        <div key={meal} className="rounded-xl bg-white p-3 text-sm text-slate-700 border border-slate-100">
                          {meal}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="font-medium text-slate-900">Last meal guidance</p>
                    <p className="text-sm text-slate-600 mt-1">Lower carb. Clean, simple, repeatable.</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {mealIdeas.lastMeal.map((item) => (
                        <Badge key={item} className="rounded-full bg-white text-slate-700 border border-emerald-100 hover:bg-white">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                  <CardHeader>
                    <SectionTitle icon={Salad} title="Bowl method builder" subtitle="One of the app’s unique differentiators." />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="rounded-2xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Protein</p>
                        <p className="font-medium mt-1">Chicken, fish, turkey, eggs, tuna</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Veggies</p>
                        <p className="font-medium mt-1">Greens, broccoli, cucumbers, salads</p>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Carbs</p>
                        <p className="font-medium mt-1">Rice, wraps, potatoes, fruit earlier in day</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="font-medium text-slate-900">Program progression</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Weeks 1–6 build structure with the 32 oz bowl. Weeks 7–12 tighten portions with the 24 oz bowl.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                  <CardHeader>
                    <SectionTitle icon={NotebookPen} title="Bloating tracker" subtitle="Turns general advice into personalized insight." />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {bloatingTriggers.map((trigger) => {
                      const logged = bloatingLogged.includes(trigger);
                      return (
                        <div key={trigger} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                          <span className="text-sm text-slate-700">{trigger}</span>
                          <Button size="sm" variant={logged ? "default" : "outline"} className="rounded-full" onClick={() => toggleBloating(trigger)}>
                            {logged ? "Logged" : "Log reaction"}
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent active={activeTab === "progress"}>
            <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
              <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                <CardHeader>
                  <SectionTitle
                    icon={Camera}
                    title="Measurements and check-ins"
                    subtitle="Weight, waist, hips, thighs, arms, progress photos, and notes."
                  />
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  {(Object.keys(measurements) as Array<keyof typeof measurements>).map((key) => (
                    <div key={key} className="space-y-2">
                      <Label className="capitalize">{key}</Label>
                      <Input
                        value={measurements[key]}
                        onChange={(e) => handleMeasurement(key, e.target.value)}
                        placeholder={`Enter ${key}`}
                        className="rounded-2xl h-12"
                      />
                    </div>
                  ))}
                  <div className="md:col-span-2 rounded-2xl border border-dashed p-6 text-center bg-slate-50">
                    <Camera className="h-8 w-8 mx-auto text-slate-400" />
                    <p className="font-medium text-slate-800 mt-3">Upload progress photos</p>
                    <p className="text-sm text-slate-500 mt-1">Front, side, back, or custom weekly check-ins.</p>
                    <Button className="rounded-2xl mt-4" onClick={() => photoInputRef.current?.click()}>
                      Add photos
                    </Button>
                    {photoMeta.length > 0 && (
                      <ul className="mt-4 text-left text-xs text-slate-600 max-h-32 overflow-y-auto mx-auto max-w-md space-y-1">
                        {photoMeta.map((p, i) => (
                          <li key={`${p.name}-${i}`}>
                            {p.name} ({Math.round(p.size / 1024)} KB)
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                  <CardHeader>
                    <SectionTitle icon={Trophy} title="Weekly wins" subtitle="Retention grows when users see more than just scale changes." />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      "Hit fasting window 5 days this week",
                      "Reached water goal 4 days in a row",
                      "Completed movement target 3 times",
                      "Stayed on bowl plan for all main meals",
                    ].map((win) => (
                      <div key={win} className="rounded-2xl bg-amber-50 p-4 text-sm text-slate-700 border border-amber-100">
                        {win}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                  <CardHeader>
                    <SectionTitle
                      icon={NotebookPen}
                      title="Reflection journal"
                      subtitle="Supports the emotional side of transformation and adherence."
                    />
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="How did today feel? What triggered cravings? What made you proud?"
                      className="min-h-[160px] rounded-2xl"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent active={activeTab === "community"}>
            <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-6">
              <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                <CardHeader>
                  <SectionTitle icon={Users} title="Challenge feed" subtitle="Coach updates, wins, reminders, and engagement prompts." />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[520px] pr-4">
                    <div className="space-y-4">
                      {feedPosts.map((post, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="rounded-[1.5rem] border border-slate-100 bg-white p-4"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar>
                              <AvatarFallback>{post.author.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">{post.author}</p>
                              <p className="text-xs text-slate-500">{post.role}</p>
                            </div>
                          </div>
                          <p className="font-medium text-slate-900">{post.title}</p>
                          <p className="text-sm text-slate-600 mt-2">{post.body}</p>
                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => bumpLike(idx)}>
                              Like {feedLikes[idx] ? `(${feedLikes[idx]})` : ""}
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-xl">
                              Comment
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-xl">
                              Celebrate
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                  <CardHeader>
                    <SectionTitle
                      icon={Sparkles}
                      title="Member journey"
                      subtitle="Identity-based messaging makes this more than a tracker."
                    />
                  </CardHeader>
                  <CardContent className="space-y-4 text-slate-700">
                    <p>
                      This 12-week journey is not a crash diet. It is a guided system for discipline, confidence, consistency, and visible
                      transformation.
                    </p>
                    <p>
                      The app should reinforce that users are not just losing weight — they are learning a repeatable lifestyle.
                    </p>
                    <div className="rounded-2xl bg-fuchsia-50 p-4 border border-fuchsia-100">
                      <p className="font-medium text-slate-900">Suggested engagement loops</p>
                      <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                        <li>Daily push reminders</li>
                        <li>Streak badges</li>
                        <li>Coach voice notes</li>
                        <li>Weekly photo prompts</li>
                        <li>Sunday reset and fluid-day check-in</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                  <CardHeader>
                    <SectionTitle icon={Moon} title="Weekly reset day" subtitle="A dedicated rhythm for recovery and re-commitment." />
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-700">
                    <div className="rounded-2xl border border-slate-100 p-4">Up to 3 protein shakes</div>
                    <div className="rounded-2xl border border-slate-100 p-4">1 bowl of bone broth</div>
                    <div className="rounded-2xl border border-slate-100 p-4">Plenty of water</div>
                    <div className="rounded-2xl border border-slate-100 p-4">Optional ACV twice this day</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent active={activeTab === "coach"}>
            <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
              <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                <CardHeader>
                  <SectionTitle icon={Users} title="Admin and coach panel" subtitle="This is where the business side lives." />
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <div className="rounded-2xl border border-slate-100 p-4">Create new 12-week cohorts</div>
                  <div className="rounded-2xl border border-slate-100 p-4">Schedule coach posts and reminders</div>
                  <div className="rounded-2xl border border-slate-100 p-4">Review member compliance dashboards</div>
                  <div className="rounded-2xl border border-slate-100 p-4">Unlock premium guides, recipes, and lessons</div>
                  <div className="rounded-2xl border border-slate-100 p-4">Send nudges to inactive members</div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                <CardHeader>
                  <SectionTitle
                    icon={Sparkles}
                    title="Recommended production stack"
                    subtitle="For turning this prototype into a working product."
                  />
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <CardTitle className="text-base">Frontend</CardTitle>
                    <CardDescription className="text-slate-700 mt-1">Next.js + Tailwind + shadcn/ui + Framer Motion</CardDescription>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <CardTitle className="text-base">Backend</CardTitle>
                    <CardDescription className="text-slate-700 mt-1">
                      Supabase for auth, profiles, challenge data, checklists, photos, and notifications
                    </CardDescription>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <CardTitle className="text-base">Payments</CardTitle>
                    <CardDescription className="text-slate-700 mt-1">
                      Stripe for monthly membership, private coaching upsells, and cohort access
                    </CardDescription>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <CardTitle className="text-base">Core entities</CardTitle>
                    <CardDescription className="text-slate-700 mt-1">
                      Users, challenge plans, daily logs, meals, measurements, photos, posts, comments, reminders
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
