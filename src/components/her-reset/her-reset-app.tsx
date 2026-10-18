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
import { formatCountdown, getFastingPhase, getMinutesUntilPhaseEnd } from "@/lib/fasting-live";
import {
  buildDailyLog,
  computeChallengeWeek,
  computeWeeklyWins,
  defaultChecks,
  getDateKey,
  rolloverDay,
} from "@/lib/daily-log";
import { clearPersisted, defaultState, loadPersisted, savePersisted, type PersistedState } from "@/lib/her-reset-persist";
import type { ChecklistState, TabId } from "@/lib/her-reset-types";
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
  CardHeader,
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

const TAB_IDS: TabId[] = ["dashboard", "fasting", "meals", "progress", "community", "coach"];

function isTabId(value: unknown): value is TabId {
  return typeof value === "string" && (TAB_IDS as string[]).includes(value);
}

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

type HerResetAppProps = {
  /** Called with the full program state after every change (used for cloud sync). */
  onStateChange?: (state: PersistedState) => void;
};

export function HerResetApp({ onStateChange }: HerResetAppProps = {}) {
  const checklistAnchorRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fastWindowFieldsRef = useRef<HTMLDivElement>(null);
  const fastStartInputRef = useRef<HTMLInputElement>(null);
  const lastPhaseRef = useRef<string | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [lastActiveDate, setLastActiveDate] = useState(getDateKey());
  const [challengeStartDate, setChallengeStartDate] = useState(getDateKey());
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [currentWeek, setCurrentWeek] = useState(1);
  const [fastStart, setFastStart] = useState("20:00");
  const [fastEnd, setFastEnd] = useState("12:00");
  const [waterCount, setWaterCount] = useState(0);
  const [movementMinutes, setMovementMinutes] = useState(0);
  const [movementTarget, setMovementTarget] = useState(20);
  const [notes, setNotes] = useState("");
  const [measurements, setMeasurements] = useState(defaultMeasurements);
  const [checks, setChecks] = useState<ChecklistState>(defaultChecks);
  const [bloatingLogged, setBloatingLogged] = useState<string[]>([]);
  const [feedLikes, setFeedLikes] = useState<Record<number, number>>({});
  const [feedComments, setFeedComments] = useState<Record<number, string[]>>({});
  const [feedCelebrations, setFeedCelebrations] = useState<Record<number, number>>({});
  const [photoMeta, setPhotoMeta] = useState<Array<{ name: string; size: number; savedAt: string }>>([]);
  const [dailyHistory, setDailyHistory] = useState<PersistedState["dailyHistory"]>([]);
  const [measurementHistory, setMeasurementHistory] = useState<PersistedState["measurementHistory"]>([]);
  const [journalEntries, setJournalEntries] = useState<PersistedState["journalEntries"]>([]);
  const [weeklyResetChecks, setWeeklyResetChecks] = useState<Record<string, boolean>>({});
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [openCommentIdx, setOpenCommentIdx] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const loaded = loadPersisted() ?? defaultState();
    const rolled = rolloverDay(loaded.lastActiveDate, {
      checks: loaded.checks,
      waterCount: loaded.waterCount,
      movementMinutes: loaded.movementMinutes,
      bloatingLogged: loaded.bloatingLogged,
      dailyHistory: loaded.dailyHistory,
      notes: loaded.notes,
      journalEntries: loaded.journalEntries,
    });

    startTransition(() => {
      setLastActiveDate(rolled.lastActiveDate);
      setChallengeStartDate(loaded.challengeStartDate);
      if (isTabId(loaded.activeTab)) setActiveTab(loaded.activeTab);
      setCurrentWeek(loaded.currentWeek || computeChallengeWeek(loaded.challengeStartDate));
      setFastStart(loaded.fastStart);
      setFastEnd(loaded.fastEnd);
      setWaterCount(rolled.waterCount);
      setMovementMinutes(rolled.movementMinutes);
      setMovementTarget(loaded.movementTarget);
      setNotes(rolled.notes);
      setMeasurements({ ...defaultMeasurements, ...loaded.measurements });
      setChecks(rolled.checks);
      setBloatingLogged(rolled.bloatingLogged);
      setFeedLikes(loaded.feedLikes);
      setFeedComments(loaded.feedComments);
      setFeedCelebrations(loaded.feedCelebrations);
      setPhotoMeta(loaded.photoMeta);
      setDailyHistory(rolled.dailyHistory);
      setMeasurementHistory(loaded.measurementHistory);
      setJournalEntries(rolled.journalEntries);
      setWeeklyResetChecks(loaded.weeklyResetChecks);
      setRemindersEnabled(loaded.remindersEnabled);
      setHydrated(true);
    });
  }, []);

  const persistSnapshot = useCallback((): PersistedState => {
    return {
      v: 2,
      lastActiveDate,
      challengeStartDate,
      activeTab,
      currentWeek,
      fastStart,
      fastEnd,
      waterCount,
      movementMinutes,
      movementTarget,
      notes,
      measurements,
      checks,
      bloatingLogged,
      feedLikes,
      feedComments,
      feedCelebrations,
      photoMeta,
      dailyHistory,
      measurementHistory,
      journalEntries,
      weeklyResetChecks,
      remindersEnabled,
    };
  }, [
    activeTab,
    bloatingLogged,
    challengeStartDate,
    checks,
    currentWeek,
    dailyHistory,
    fastEnd,
    fastStart,
    feedCelebrations,
    feedComments,
    feedLikes,
    journalEntries,
    lastActiveDate,
    measurementHistory,
    measurements,
    movementMinutes,
    movementTarget,
    notes,
    photoMeta,
    remindersEnabled,
    waterCount,
    weeklyResetChecks,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    const snapshot = persistSnapshot();
    savePersisted(snapshot);
    onStateChange?.(snapshot);
  }, [hydrated, persistSnapshot, onStateChange]);

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

  const logMovement = (minutes: number) => {
    const next = Math.min(120, movementMinutes + minutes);
    setMovementMinutes(next);
    if (next >= movementTarget) setChecks((c) => ({ ...c, move: true }));
  };

  const bumpCelebrate = (idx: number) => {
    setFeedCelebrations((prev) => ({ ...prev, [idx]: (prev[idx] ?? 0) + 1 }));
  };

  const submitComment = (idx: number) => {
    const text = commentDraft.trim();
    if (!text) return;
    setFeedComments((prev) => ({ ...prev, [idx]: [...(prev[idx] ?? []), text] }));
    setCommentDraft("");
    setOpenCommentIdx(null);
  };

  const saveMeasurementCheckIn = () => {
    const hasValue = Object.values(measurements).some((v) => v.trim());
    if (!hasValue) return;
    setMeasurementHistory((prev) => [...prev, { date: getDateKey(), values: { ...measurements } }]);
  };

  const toggleReminders = async () => {
    if (!remindersEnabled) {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      const permission = await Notification.requestPermission();
      if (permission === "granted") setRemindersEnabled(true);
      return;
    }
    setRemindersEnabled(false);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(persistSnapshot(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mehealth-export-${getDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAllData = () => {
    if (!window.confirm("Reset all saved progress? This cannot be undone.")) return;
    clearPersisted();
    window.location.reload();
  };

  const syncWeekFromChallenge = () => {
    setCurrentWeek(computeChallengeWeek(challengeStartDate));
  };

  const fastingMinutes = useMemo(() => fastingWindowMinutes(fastEnd, fastStart), [fastEnd, fastStart]);
  const targetFastDisplay = fastingMinutes !== null ? formatDurationClock(fastingMinutes) : "—";
  const fastingPhase = useMemo(() => getFastingPhase(fastEnd, fastStart, now), [fastEnd, fastStart, now]);
  const phaseCountdown = useMemo(() => getMinutesUntilPhaseEnd(fastEnd, fastStart, now), [fastEnd, fastStart, now]);
  const phaseCountdownDisplay = phaseCountdown !== null ? formatCountdown(phaseCountdown) : "—";

  const todayLog = useMemo(
    () => buildDailyLog(getDateKey(), checks, waterCount, movementMinutes),
    [checks, waterCount, movementMinutes],
  );
  const weeklyWins = useMemo(() => computeWeeklyWins(dailyHistory, todayLog), [dailyHistory, todayLog]);

  const coachStats = useMemo(() => {
    const logs = [...dailyHistory, todayLog];
    const avgCompletion = logs.length
      ? Math.round(logs.reduce((sum, log) => sum + log.completion, 0) / logs.length)
      : completion;
    const waterGoalDays = logs.filter((log) => log.waterCount >= 6).length;
    const fastingDays = logs.filter((log) => log.checks.fasting).length;
    return { avgCompletion, waterGoalDays, fastingDays, daysLogged: logs.length };
  }, [completion, dailyHistory, todayLog]);

  useEffect(() => {
    if (!remindersEnabled || typeof window === "undefined" || Notification.permission !== "granted") return;
    const phaseKey = `${fastingPhase ?? "unknown"}-${getDateKey()}`;
    if (lastPhaseRef.current === phaseKey) return;
    if (lastPhaseRef.current !== null && fastingPhase) {
      const label = fastingPhase === "eating" ? "Eating window is open." : "Fasting window has started.";
      new Notification("MeHealth", { body: label });
    }
    lastPhaseRef.current = phaseKey;
  }, [fastingPhase, remindersEnabled]);

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
    setChecks({ ...defaultChecks });
    setWaterCount(0);
    setMovementMinutes(0);
    setBloatingLogged([]);
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
                  <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">MeHealth Accountability</h1>
                  <p className="text-white/85 mt-3 max-w-2xl text-sm md:text-base">
                    A guided body reset platform built around fasting windows, bowl-based portioning, hydration, movement,
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
                      Tap bottles as you drink. Hitting 6 auto-checks your water goal for today.
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
                      <Button variant="outline" size="sm" className="rounded-xl mt-3" onClick={syncWeekFromChallenge}>
                        Sync week from challenge start
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                  <CardHeader>
                    <SectionTitle icon={HeartPulse} title="Movement" subtitle="Log minutes completed today." />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Logged today</span>
                      <span className="font-semibold text-slate-900">{movementMinutes} / {movementTarget} min</span>
                    </div>
                    <Progress value={Math.min(100, Math.round((movementMinutes / Math.max(movementTarget, 1)) * 100))} />
                    <div className="flex flex-wrap gap-2">
                      {[10, 15, 20, 30].map((m) => (
                        <Button key={m} size="sm" variant="outline" className="rounded-xl" onClick={() => logMovement(m)}>
                          +{m} min
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Daily movement target</Label>
                      <input
                        type="range"
                        min={10}
                        max={90}
                        step={5}
                        value={movementTarget}
                        onChange={(e) => setMovementTarget(Number(e.target.value))}
                        className="w-full accent-fuchsia-600"
                      />
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

                  <div className="rounded-[1.5rem] bg-slate-950 text-white p-6 space-y-4">
                    <div>
                      <p className="text-sm text-white/70">
                        {fastingPhase === "eating"
                          ? "Eating window open"
                          : fastingPhase === "fasting"
                            ? "Fasting in progress"
                            : "Set a valid window"}
                      </p>
                      <div className="flex items-end gap-3 mt-2">
                        <span className="text-4xl font-semibold">{phaseCountdownDisplay}</span>
                        <span className="text-white/70 pb-1">
                          {fastingPhase === "eating" ? "until fast begins" : "until eating opens"}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-sm text-white/70">Target fast length</p>
                      <p className="text-2xl font-semibold mt-1">{targetFastDisplay}</p>
                      <p className="text-sm text-white/75 mt-2">
                        Fast starts: {fastStart} · Eating opens: {fastEnd} · Monday–Saturday plan
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">Window reminders</p>
                        <p className="text-sm text-slate-600 mt-1">
                          Browser notifications when your eating or fasting phase changes.
                        </p>
                      </div>
                      <Button variant={remindersEnabled ? "default" : "outline"} className="rounded-xl shrink-0" onClick={toggleReminders}>
                        {remindersEnabled ? "On" : "Enable"}
                      </Button>
                    </div>
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
                  <div className="md:col-span-2">
                    <Button className="rounded-2xl w-full" onClick={saveMeasurementCheckIn}>
                      Save today&apos;s check-in
                    </Button>
                  </div>
                  {measurementHistory.length > 0 && (
                    <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4 max-h-40 overflow-y-auto">
                      <p className="text-sm font-medium text-slate-800 mb-2">Check-in history</p>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {[...measurementHistory].reverse().slice(0, 8).map((entry, i) => (
                          <li key={`${entry.date}-${i}`}>
                            {entry.date}: {Object.entries(entry.values).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(" · ") || "saved"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                    {weeklyWins.map((win) => (
                      <div
                        key={win.text}
                        className={`rounded-2xl p-4 text-sm border ${
                          win.earned ? "bg-emerald-50 text-emerald-900 border-emerald-100" : "bg-amber-50 text-slate-700 border-amber-100"
                        }`}
                      >
                        {win.earned ? "✓ " : "○ "}
                        {win.text}
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
                    {journalEntries.length > 0 && (
                      <div className="mt-4 rounded-2xl bg-slate-50 p-4 max-h-36 overflow-y-auto">
                        <p className="text-sm font-medium text-slate-800 mb-2">Past entries</p>
                        <ul className="space-y-2 text-xs text-slate-600">
                          {[...journalEntries].reverse().slice(0, 5).map((entry, i) => (
                            <li key={`${entry.date}-${i}`}>
                              <span className="font-medium text-slate-700">{entry.date}:</span> {entry.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => setOpenCommentIdx(openCommentIdx === idx ? null : idx)}
                            >
                              Comment {(feedComments[idx]?.length ?? 0) > 0 ? `(${feedComments[idx].length})` : ""}
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => bumpCelebrate(idx)}>
                              Celebrate {feedCelebrations[idx] ? `(${feedCelebrations[idx]})` : ""}
                            </Button>
                          </div>
                          {openCommentIdx === idx && (
                            <div className="mt-3 flex gap-2">
                              <Input
                                value={commentDraft}
                                onChange={(e) => setCommentDraft(e.target.value)}
                                placeholder="Write a comment..."
                                className="rounded-xl h-10"
                                onKeyDown={(e) => e.key === "Enter" && submitComment(idx)}
                              />
                              <Button size="sm" className="rounded-xl" onClick={() => submitComment(idx)}>
                                Post
                              </Button>
                            </div>
                          )}
                          {(feedComments[idx]?.length ?? 0) > 0 && (
                            <ul className="mt-3 space-y-1 text-xs text-slate-600">
                              {feedComments[idx].map((c, i) => (
                                <li key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                                  {c}
                                </li>
                              ))}
                            </ul>
                          )}
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
                    {[
                      "Up to 3 protein shakes",
                      "1 bowl of bone broth",
                      "Plenty of water",
                      "Optional ACV twice this day",
                    ].map((item) => (
                      <label key={item} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 cursor-pointer">
                        <span>{item}</span>
                        <Checkbox
                          checked={weeklyResetChecks[item] ?? false}
                          onCheckedChange={(value) => setWeeklyResetChecks((prev) => ({ ...prev, [item]: value }))}
                        />
                      </label>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent active={activeTab === "coach"}>
            <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
              <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                <CardHeader>
                  <SectionTitle icon={Users} title="Compliance dashboard" subtitle="Live stats from member activity." />
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs text-slate-500">Days logged</p>
                      <p className="text-2xl font-semibold text-slate-900">{coachStats.daysLogged}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs text-slate-500">Avg completion</p>
                      <p className="text-2xl font-semibold text-slate-900">{coachStats.avgCompletion}%</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs text-slate-500">Fasting days</p>
                      <p className="text-2xl font-semibold text-slate-900">{coachStats.fastingDays}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs text-slate-500">Water goal days</p>
                      <p className="text-2xl font-semibold text-slate-900">{coachStats.waterGoalDays}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-medium text-slate-900">Challenge cohort</p>
                    <p className="mt-1">Started {challengeStartDate} · Currently week {currentWeek}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={exportData}>
                      Export member data
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={resetAllData}>
                      Reset all progress
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-0 shadow-sm bg-white/85">
                <CardHeader>
                  <SectionTitle icon={Sparkles} title="Coach actions" subtitle="Tools for running the 12-week program." />
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-medium text-slate-900">Schedule reminders</p>
                    <p className="mt-1 text-slate-600">Members enable window reminders on the Fasting tab.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-medium text-slate-900">Review compliance</p>
                    <p className="mt-1 text-slate-600">Use the dashboard stats and weekly wins to spot adherence trends.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-medium text-slate-900">Weekly reset day</p>
                    <p className="mt-1 text-slate-600">Members track reset-day items in the Community tab.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-medium text-slate-900">Progress check-ins</p>
                    <p className="mt-1 text-slate-600">{measurementHistory.length} measurement logs · {photoMeta.length} photos uploaded</p>
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
