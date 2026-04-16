import {
  Apple,
  CircleCheckBig,
  Clock3,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  GlassWater,
  Salad,
  Sun,
} from "lucide-react";

export const challengeWeeks = Array.from({ length: 12 }, (_, i) => i + 1);

export const approvedFastedItems = [
  {
    title: "Water",
    subtitle: "Plain, mineral, or sparkling unsweetened",
    detail: "Lemon or cucumber only sparingly.",
    icon: GlassWater,
  },
  {
    title: "Apple Cider Vinegar",
    subtitle: "1–2 tbsp in water",
    detail: "No honey, sugar, or juice added.",
    icon: Apple,
  },
  {
    title: "Black Coffee",
    subtitle: "No cream, sugar, milk, or flavors",
    detail: "Cinnamon or a pinch of salt is okay.",
    icon: Coffee,
  },
  {
    title: "Unsweetened Tea",
    subtitle: "Green, black, herbal, or matcha",
    detail: "Zero-calorie only. No honey or milk.",
    icon: Sun,
  },
  {
    title: "Electrolytes",
    subtitle: "No-sugar electrolytes",
    detail: "Good for long fasting windows and hot days.",
    icon: Droplets,
  },
];

export const dailyChecklistSeed = [
  { id: "fasting" as const, label: "Follow fasting window", icon: Clock3 },
  { id: "water" as const, label: "Drink at least 6 bottles of water", icon: Droplets },
  { id: "acv" as const, label: "Take ACV", icon: Apple },
  { id: "mct" as const, label: "Take MCT oil", icon: Flame },
  { id: "bowl" as const, label: "Eat from portion bowl", icon: Salad },
  { id: "move" as const, label: "Move your body", icon: Dumbbell },
  { id: "consistent" as const, label: "Stay consistent", icon: CircleCheckBig },
];

export const mealIdeas = {
  breakFast: [
    "2–3 eggs + water",
    "Chicken breast + cucumber slices",
    "Tuna + water",
    "Turkey slices + tea",
    "Protein shake + water",
  ],
  lunchBowls: [
    "Salmon + rice + broccoli",
    "Chicken wrap + salad",
    "Teriyaki bowl with veggies",
    "Taco salad",
    "Tofu bowl with rice and vegetables",
  ],
  lastMeal: [
    "Steak + salad",
    "Chicken + green beans",
    "Turkey + greens",
    "Salmon + broccoli",
    "Fish + vegetables",
  ],
};

export const bloatingTriggers = [
  "Raw cruciferous vegetables",
  "Salty processed foods",
  "Artificial sweeteners",
  "Carbonated drinks",
  "Beans and lentils",
  "Dairy if lactose sensitive",
];

export const feedPosts = [
  {
    author: "Coach Dee",
    role: "Challenge Coach",
    title: "Today’s reminder",
    body: "Your job is not to be perfect. Your job is to complete today’s checklist and protect your eating window.",
  },
  {
    author: "Community",
    role: "Member Win",
    title: "Week 2 victory",
    body: "Three days in a row of hitting water, movement, and protein-first meals is a real win. Small habits create big results.",
  },
  {
    author: "Coach Dee",
    role: "Food Focus",
    title: "Break your fast with protein",
    body: "Start with protein so cravings stay lower and your meals stay structured instead of random.",
  },
];
