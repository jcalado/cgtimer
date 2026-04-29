import { LayoutNode, SavedLayout } from "./layout-types";
import { generateId, makeSplit, makeWidget } from "./layout-tree";

export const STORAGE_KEY = "cgtimer.widgetLayouts.v2";

export const loadSavedLayouts = (): SavedLayout[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedLayout[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const persistLayouts = (layouts: SavedLayout[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
};

export const createDefaultLayout = (): SavedLayout => ({
  id: generateId(),
  name: "Untitled",
  updatedAt: Date.now(),
  root: makeSplit("vertical", [
    makeWidget("primaryTimer"),
    makeWidget("secondaryTimer"),
  ]) as LayoutNode,
});
