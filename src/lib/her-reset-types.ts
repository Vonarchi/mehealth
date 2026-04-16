export type ChecklistId =
  | "fasting"
  | "water"
  | "acv"
  | "mct"
  | "bowl"
  | "move"
  | "consistent";

export type ChecklistState = Record<ChecklistId, boolean>;

export type TabId = "dashboard" | "fasting" | "meals" | "progress" | "community" | "coach";
