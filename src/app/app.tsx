import React, { useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Body1Strong,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Option,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Switch,
  Tooltip,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  ArrowRepeatAllRegular,
  CalendarClockRegular,
  ClockRegular,
  ColorRegular,
  CopyRegular,
  DeleteRegular,
  DismissRegular,
  DocumentAddRegular,
  EditRegular,
  EyeRegular,
  FlagRegular,
  FullScreenMaximizeRegular,
  FullScreenMinimizeRegular,
  GlobeRegular,
  HistoryRegular,
  HourglassRegular,
  PauseRegular,
  PlayRegular,
  PlayCircleRegular,
  PlugConnectedRegular,
  ProhibitedRegular,
  PulseRegular,
  RecordRegular,
  ReOrderRegular,
  RenameRegular,
  SaveRegular,
  SplitHorizontalRegular,
  SplitVerticalRegular,
  StopRegular,
  TextFontRegular,
} from "@fluentui/react-icons";
import { Utils } from "../utils";

type WidgetKind =
  | "worldClock"
  | "localClock"
  | "primaryTimer"
  | "secondaryTimer"
  | "timeOfDayCountdown"
  | "loopState"
  | "oscTimer"
  | "ontimeTimer"
  | "ontimeTitle"
  | "ontimePlayback"
  | "ontimeOnAir"
  | "ontimeExpectedFinish"
  | "recorderStatus";

type WidgetSettings = {
  timezoneId?: string;
  labelColor?: string;
  faceColor?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  customLabel?: string;
  oscTimerName?: string;
  targetTime?: string; // HH:MM:SS for timeOfDayCountdown
  recorderId?: string; // hyperdeck id for recorderStatus
};

type WidgetGroup = "clocks" | "playback" | "timers" | "ontime" | "recorders";

type WidgetDefinition = {
  key: WidgetKind;
  label: string;
  description: string;
  icon: React.ReactElement;
  color: string;
  group: WidgetGroup;
};

const WIDGET_GROUPS: { id: WidgetGroup; label: string }[] = [
  { id: "clocks", label: "Clocks" },
  { id: "playback", label: "Playback" },
  { id: "timers", label: "Timers" },
  { id: "ontime", label: "Ontime" },
  { id: "recorders", label: "Recorders" },
];

type WidgetNode = {
  type: "widget";
  id: string;
  widgetKey: WidgetKind;
  settings?: WidgetSettings;
};

type SplitNode = {
  type: "split";
  id: string;
  direction: "horizontal" | "vertical";
  sizes: number[];
  children: LayoutNode[];
};

type LayoutNode = WidgetNode | SplitNode;

type SavedLayout = {
  id: string;
  name: string;
  root: LayoutNode | null;
  updatedAt: number;
};

type OscTimerState = {
  startedAt: number | null;
  elapsed: number;
};

const STORAGE_KEY = "cgtimer.widgetLayouts.v2";
const RESIZE_HANDLE_PX = 6;

const widgetCatalog: Record<WidgetKind, WidgetDefinition> = {
  worldClock: {
    key: "worldClock",
    label: "World Clock",
    description: "Pick a configured timezone and pin it here",
    icon: <GlobeRegular />,
    color: "#3b82f6",
    group: "clocks",
  },
  localClock: {
    key: "localClock",
    label: "Local Clock",
    description: "Shows the local system time",
    icon: <ClockRegular />,
    color: "#14b8a6",
    group: "clocks",
  },
  primaryTimer: {
    key: "primaryTimer",
    label: "Remaining Timer",
    description: "Shows remaining time",
    icon: <HourglassRegular />,
    color: "#f59e0b",
    group: "playback",
  },
  secondaryTimer: {
    key: "secondaryTimer",
    label: "Elapsed Timer",
    description: "Shows elapsed time",
    icon: <HistoryRegular />,
    color: "#22c55e",
    group: "playback",
  },
  loopState: {
    key: "loopState",
    label: "Loop State",
    description: "Quick indicator for loop mode",
    icon: <ArrowRepeatAllRegular />,
    color: "#a855f7",
    group: "playback",
  },
  timeOfDayCountdown: {
    key: "timeOfDayCountdown",
    label: "Time-of-day Countdown",
    description: "Counts down to a target wall-clock time",
    icon: <CalendarClockRegular />,
    color: "#ef4444",
    group: "timers",
  },
  oscTimer: {
    key: "oscTimer",
    label: "OSC Timer",
    description: "Stopwatch triggered via OSC commands",
    icon: <PulseRegular />,
    color: "#ec4899",
    group: "timers",
  },
  ontimeTimer: {
    key: "ontimeTimer",
    label: "Ontime Timer",
    description: "Mirrors the current timer from Ontime over OSC",
    icon: <PlugConnectedRegular />,
    color: "#10b981",
    group: "ontime",
  },
  ontimeTitle: {
    key: "ontimeTitle",
    label: "Ontime Title",
    description: "Title of the currently running Ontime event",
    icon: <TextFontRegular />,
    color: "#0ea5e9",
    group: "ontime",
  },
  ontimePlayback: {
    key: "ontimePlayback",
    label: "Ontime Playback",
    description: "Ontime playback state (play, pause, stop, roll, armed)",
    icon: <PlayCircleRegular />,
    color: "#84cc16",
    group: "ontime",
  },
  ontimeOnAir: {
    key: "ontimeOnAir",
    label: "Ontime On-Air",
    description: "On-air indicator from Ontime",
    icon: <RecordRegular />,
    color: "#dc2626",
    group: "ontime",
  },
  ontimeExpectedFinish: {
    key: "ontimeExpectedFinish",
    label: "Ontime Expected Finish",
    description: "Wall-clock time the current Ontime event is expected to end",
    icon: <FlagRegular />,
    color: "#f97316",
    group: "ontime",
  },
  recorderStatus: {
    key: "recorderStatus",
    label: "HyperDeck Recorder",
    description: "Recording status of a Blackmagic HyperDeck",
    icon: <RecordRegular />,
    color: "#dc2626",
    group: "recorders",
  },
};

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const equalSizes = (count: number): number[] =>
  Array.from({ length: count }, () => 100 / count);

const makeWidget = (
  widgetKey: WidgetKind,
  settings?: WidgetSettings
): WidgetNode => ({
  type: "widget",
  id: generateId(),
  widgetKey,
  settings,
});

const makeSplit = (
  direction: "horizontal" | "vertical",
  children: LayoutNode[]
): SplitNode => ({
  type: "split",
  id: generateId(),
  direction,
  sizes: equalSizes(children.length),
  children,
});

const findParent = (
  root: LayoutNode | null,
  childId: string
): { parent: SplitNode; index: number } | null => {
  if (!root || root.type !== "split") return null;
  const idx = root.children.findIndex((c) => c.id === childId);
  if (idx >= 0) return { parent: root, index: idx };
  for (const child of root.children) {
    const hit = findParent(child, childId);
    if (hit) return hit;
  }
  return null;
};

const collapse = (node: LayoutNode): LayoutNode => {
  if (node.type === "widget") return node;
  const collapsedChildren = node.children.map(collapse);
  if (collapsedChildren.length === 1) return collapsedChildren[0];
  // Flatten same-direction nested splits to avoid degenerate trees
  const flattened: LayoutNode[] = [];
  const flattenedSizes: number[] = [];
  collapsedChildren.forEach((child, i) => {
    if (
      child.type === "split" &&
      child.direction === node.direction &&
      child.children.length > 0
    ) {
      const parentShare = node.sizes[i] ?? 100 / collapsedChildren.length;
      child.children.forEach((grand, gi) => {
        flattened.push(grand);
        const grandShare = child.sizes[gi] ?? 100 / child.children.length;
        flattenedSizes.push((parentShare * grandShare) / 100);
      });
    } else {
      flattened.push(child);
      flattenedSizes.push(node.sizes[i] ?? 100 / collapsedChildren.length);
    }
  });
  return { ...node, children: flattened, sizes: flattenedSizes };
};

const removeNode = (
  root: LayoutNode | null,
  targetId: string
): LayoutNode | null => {
  if (!root) return null;
  if (root.id === targetId) return null;
  if (root.type === "widget") return root;
  const filtered: LayoutNode[] = [];
  const filteredSizes: number[] = [];
  root.children.forEach((child, i) => {
    if (child.id === targetId) return;
    const reduced = removeNode(child, targetId);
    if (reduced) {
      filtered.push(reduced);
      filteredSizes.push(root.sizes[i] ?? 100 / root.children.length);
    }
  });
  if (filtered.length === 0) return null;
  // Renormalize sizes to sum 100
  const total = filteredSizes.reduce((a, b) => a + b, 0) || 1;
  const normalized = filteredSizes.map((s) => (s * 100) / total);
  const next: SplitNode = { ...root, children: filtered, sizes: normalized };
  return collapse(next);
};

const splitWidgetAt = (
  root: LayoutNode | null,
  targetId: string,
  direction: "horizontal" | "vertical",
  position: "before" | "after",
  newWidget: WidgetNode
): LayoutNode | null => {
  if (!root) return newWidget;
  if (root.id === targetId && root.type === "widget") {
    const children =
      position === "after" ? [root, newWidget] : [newWidget, root];
    return makeSplit(direction, children);
  }
  if (root.type === "widget") return root;
  const hit = root.children.findIndex((c) => c.id === targetId);
  if (hit >= 0 && root.direction === direction) {
    // Insert as sibling in same-direction parent
    const insertAt = position === "after" ? hit + 1 : hit;
    const newChildren = [...root.children];
    newChildren.splice(insertAt, 0, newWidget);
    return { ...root, children: newChildren, sizes: equalSizes(newChildren.length) };
  }
  // Recurse
  const newChildren = root.children.map((c) =>
    splitWidgetAt(c, targetId, direction, position, newWidget)
  );
  return { ...root, children: newChildren as LayoutNode[] };
};

const appendToRoot = (
  root: LayoutNode | null,
  newWidget: WidgetNode,
  direction: "horizontal" | "vertical" = "horizontal"
): LayoutNode => {
  if (!root) return newWidget;
  if (root.type === "split" && root.direction === direction) {
    const children = [...root.children, newWidget];
    return { ...root, children, sizes: equalSizes(children.length) };
  }
  return makeSplit(direction, [root, newWidget]);
};

type Edge = "left" | "right" | "top" | "bottom";

const edgeToSplit = (
  edge: Edge
): { direction: "horizontal" | "vertical"; position: "before" | "after" } => {
  switch (edge) {
    case "left":
      return { direction: "horizontal", position: "before" };
    case "right":
      return { direction: "horizontal", position: "after" };
    case "top":
      return { direction: "vertical", position: "before" };
    case "bottom":
      return { direction: "vertical", position: "after" };
  }
};

const insertAtEdge = (
  root: LayoutNode | null,
  targetId: string,
  edge: Edge,
  newWidget: WidgetNode
): LayoutNode | null => {
  const { direction, position } = edgeToSplit(edge);
  return splitWidgetAt(root, targetId, direction, position, newWidget);
};

const findWidget = (root: LayoutNode | null, id: string): WidgetNode | null => {
  if (!root) return null;
  if (root.type === "widget") return root.id === id ? root : null;
  for (const child of root.children) {
    const hit = findWidget(child, id);
    if (hit) return hit;
  }
  return null;
};

const updateWidgetSettings = (
  root: LayoutNode | null,
  targetId: string,
  patch: WidgetSettings
): LayoutNode | null => {
  if (!root) return null;
  if (root.type === "widget") {
    if (root.id !== targetId) return root;
    return { ...root, settings: { ...root.settings, ...patch } };
  }
  return {
    ...root,
    children: root.children.map(
      (c) => updateWidgetSettings(c, targetId, patch) as LayoutNode
    ),
  };
};

const updateSplitSizes = (
  root: LayoutNode | null,
  splitId: string,
  sizes: number[]
): LayoutNode | null => {
  if (!root || root.type === "widget") return root;
  if (root.id === splitId) return { ...root, sizes };
  return {
    ...root,
    children: root.children.map(
      (c) => updateSplitSizes(c, splitId, sizes) as LayoutNode
    ),
  };
};

const collectWidgetIds = (root: LayoutNode | null): string[] => {
  if (!root) return [];
  if (root.type === "widget") return [root.id];
  return root.children.flatMap(collectWidgetIds);
};

const loadSavedLayouts = (): SavedLayout[] => {
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

const persistLayouts = (layouts: SavedLayout[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
};

const createDefaultLayout = (): SavedLayout => ({
  id: generateId(),
  name: "Untitled",
  updatedAt: Date.now(),
  root: null,
});

const useStyles = makeStyles({
  layoutPanel: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    position: "relative",
    rowGap: tokens.spacingVerticalM,
  },
  dock: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    zIndex: 10,
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow16,
    ...shorthands.padding(tokens.spacingVerticalS),
    maxHeight: "calc(100vh - 32px)",
  },
  paletteScroll: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    scrollbarWidth: "thin",
    scrollbarColor: `${tokens.colorNeutralStroke2} transparent`,
    "&::-webkit-scrollbar": {
      width: "8px",
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: tokens.colorNeutralStroke2,
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: tokens.colorNeutralStroke1,
    },
  },
  dockHandle: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    cursor: "move",
    userSelect: "none",
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
  },
  dockSection: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    minWidth: 0,
  },
  dockMeta: {
    color: tokens.colorNeutralForeground3,
  },
  dockButtonRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: tokens.spacingHorizontalXS,
    rowGap: tokens.spacingVerticalXS,
  },
  dockButtonRowSingle: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
  },
  paletteHeading: {
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    paddingTop: tokens.spacingVerticalXS,
  },
  dockResize: {
    height: "8px",
    cursor: "ew-resize",
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    marginTop: tokens.spacingVerticalXXS,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground3Hover,
    },
  },
  surface: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  surfaceEditing: {
    ...shorthands.border("1px", "dashed", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  emptySurface: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    rowGap: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
  },
  resizeHandleHorizontal: {
    width: `${RESIZE_HANDLE_PX}px`,
    backgroundColor: "transparent",
    transitionProperty: "background-color",
    transitionDuration: tokens.durationFaster,
    ":hover": { backgroundColor: tokens.colorBrandStroke2 },
    "&[data-resize-handle-active]": {
      backgroundColor: tokens.colorBrandStroke1,
    },
  },
  resizeHandleVertical: {
    height: `${RESIZE_HANDLE_PX}px`,
    backgroundColor: "transparent",
    transitionProperty: "background-color",
    transitionDuration: tokens.durationFaster,
    ":hover": { backgroundColor: tokens.colorBrandStroke2 },
    "&[data-resize-handle-active]": {
      backgroundColor: tokens.colorBrandStroke1,
    },
  },
  widgetCard: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: `inset 0 0 0 1px ${tokens.colorNeutralStroke2}`,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  widgetCardDisplay: {
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  widgetCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
  },
  widgetCardTitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  widgetCardSubtitle: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  widgetCardBody: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    position: "relative",
  },
  widgetCardActions: {
    display: "flex",
    alignItems: "center",
    columnGap: "2px",
  },
  widgetCardHeaderDraggable: {
    cursor: "grab",
    ":active": { cursor: "grabbing" },
  },
  dropZoneOverlay: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 4,
  },
  dropZone: {
    position: "absolute",
    pointerEvents: "auto",
    backgroundColor: "transparent",
    transitionProperty: "background-color",
    transitionDuration: tokens.durationFaster,
  },
  dropZoneLeft: {
    left: 0,
    top: 0,
    bottom: 0,
    width: "25%",
  },
  dropZoneRight: {
    right: 0,
    top: 0,
    bottom: 0,
    width: "25%",
  },
  dropZoneTop: {
    left: "25%",
    right: "25%",
    top: 0,
    height: "50%",
  },
  dropZoneBottom: {
    left: "25%",
    right: "25%",
    bottom: 0,
    height: "50%",
  },
  dropZoneActive: {
    backgroundColor: tokens.colorBrandBackground2,
    outline: `2px solid ${tokens.colorBrandStroke1}`,
    outlineOffset: "-2px",
  },
  rootDropZone: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: tokens.colorNeutralForeground3,
    ...shorthands.border("2px", "dashed", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    transitionProperty: "background-color, border-color",
    transitionDuration: tokens.durationFaster,
  },
  emptyPlaceholderInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    rowGap: tokens.spacingVerticalXS,
    textAlign: "center",
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
  },
  rootDropZoneActive: {
    backgroundColor: tokens.colorBrandBackground2,
    borderColor: tokens.colorBrandStroke1,
    color: tokens.colorBrandForeground1,
  },
  dragOverlayChip: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    fontSize: tokens.fontSizeBase200,
    boxShadow: tokens.shadow16,
  },
  widgetControl: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    columnGap: tokens.spacingHorizontalS,
    position: "absolute",
    top: tokens.spacingVerticalXS,
    right: tokens.spacingHorizontalXS,
    zIndex: 2,
  },
  configPopover: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    minWidth: "260px",
  },
  configRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalM,
  },
  configFooter: {
    display: "flex",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
  },
  colorSwatchInput: {
    width: "36px",
    height: "28px",
    ...shorthands.padding("0"),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: "pointer",
  },
  fullscreenButton: {
    position: "absolute",
    bottom: tokens.spacingVerticalL,
    right: tokens.spacingHorizontalL,
    zIndex: 9999,
  },
  promptField: {
    width: "100%",
  },
});

const PromptDialog = ({
  open,
  title,
  message,
  value,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onChange,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  value: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) => {
  const styles = useStyles();
  return (
    <Dialog
      open={open}
      onOpenChange={(_e, data) => {
        if (!data.open) onCancel();
      }}
    >
      <DialogSurface>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <DialogBody>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
              <Field label={message} className={styles.promptField}>
                <Input
                  autoFocus
                  value={value}
                  onChange={(_e, data) => onChange(data.value)}
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" type="button" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button appearance="primary" type="submit">
                {confirmLabel}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};

type DragData =
  | { kind: "palette"; widgetKey: WidgetKind; label: string }
  | { kind: "move"; widgetId: string; widgetKey: WidgetKind; label: string };

type DraggableProps = {
  id: string;
  data: DragData;
  className?: string;
  children: React.ReactNode;
  asLabel?: boolean;
};

const Draggable: React.FC<DraggableProps> = ({
  id,
  data,
  className,
  children,
}) => {
  const { attributes, listeners, setNodeRef } = useDraggable({ id, data });
  return (
    <div ref={setNodeRef} className={className} {...listeners} {...attributes}>
      {children}
    </div>
  );
};

type DroppableProps = {
  id: string;
  className?: string;
  activeClassName?: string;
  children?: React.ReactNode;
};

const Droppable: React.FC<DroppableProps> = ({
  id,
  className,
  activeClassName,
  children,
}) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  const merged =
    isOver && activeClassName
      ? mergeClasses(className, activeClassName)
      : className;
  return (
    <div ref={setNodeRef} className={merged}>
      {children}
    </div>
  );
};

const getWidgetColors = (
  settings?: WidgetSettings
): { labelColor?: string; faceColor?: string; backgroundColor?: string } => ({
  labelColor: settings?.labelColor || undefined,
  faceColor: settings?.faceColor || undefined,
  backgroundColor: settings?.backgroundColor || undefined,
});

type ColorConfigPanelProps = {
  node: WidgetNode;
  onChange: (updates: WidgetSettings) => void;
  onClose: () => void;
};

const ColorConfigPanel = ({ node, onChange, onClose }: ColorConfigPanelProps) => {
  const styles = useStyles();
  const colors = getWidgetColors(node.settings);
  const showLabel = node.settings?.showLabel !== false;
  const customLabel = node.settings?.customLabel ?? "";

  const handleColorChange =
    (key: "labelColor" | "faceColor" | "backgroundColor") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [key]: e.target.value || undefined });
    };

  const handleReset = () => {
    onChange({
      labelColor: undefined,
      faceColor: undefined,
      backgroundColor: undefined,
      showLabel: true,
      customLabel: undefined,
    });
  };

  return (
    <div className={styles.configPopover}>
      <Body1Strong>Widget settings</Body1Strong>

      <div className={styles.configRow}>
        <Caption1>Show label</Caption1>
        <Switch
          checked={showLabel}
          onChange={(_e, data) => onChange({ showLabel: data.checked })}
        />
      </div>

      <div className={styles.configRow}>
        <Caption1>Custom label</Caption1>
        <Input
          size="small"
          value={customLabel}
          placeholder="Default"
          disabled={!showLabel}
          onChange={(_e, data) =>
            onChange({ customLabel: data.value || undefined })
          }
        />
      </div>

      <div className={styles.configRow}>
        <Caption1>Label color</Caption1>
        <input
          type="color"
          className={styles.colorSwatchInput}
          value={colors.labelColor ?? "#aaaaaa"}
          onChange={handleColorChange("labelColor")}
          disabled={!showLabel}
        />
      </div>

      <div className={styles.configRow}>
        <Caption1>Foreground</Caption1>
        <input
          type="color"
          className={styles.colorSwatchInput}
          value={colors.faceColor ?? "#e5e9ff"}
          onChange={handleColorChange("faceColor")}
        />
      </div>

      <div className={styles.configRow}>
        <Caption1>Background</Caption1>
        <input
          type="color"
          className={styles.colorSwatchInput}
          value={colors.backgroundColor ?? "#242424"}
          onChange={handleColorChange("backgroundColor")}
        />
      </div>

      <div className={styles.configFooter}>
        <Button appearance="subtle" onClick={handleReset}>
          Reset
        </Button>
        <Button appearance="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
};

function toTime(seconds: number) {
  return new Date(seconds * 1000).toISOString().substr(11, 8);
}

function clockTime(now: number) {
  const date = new Date(now);
  const timeZoneOffset = date.getTimezoneOffset() * 60 * 1000;
  const timeZoneDate = new Date(date.getTime() - timeZoneOffset);
  return timeZoneDate.toISOString().substr(11, 8);
}

function getTimezoneTime(timezone: string, now: number): string {
  try {
    const timeString = new Date(now).toLocaleString("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = timeString.split(", ");
    return parts.length > 1 ? parts[1] : timeString;
  } catch {
    return "00:00:00";
  }
}

function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const localDate = new Date();
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const offsetMinutes = (tzDate.getTime() - localDate.getTime()) / 60000;
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const sign = offsetMinutes >= 0 ? "+" : "-";
    return `${sign}${hours}h`;
  } catch {
    return "";
  }
}

function App() {
  const styles = useStyles();
  const initialLayouts = useMemo(() => {
    const stored = loadSavedLayouts();
    return stored.length ? stored : [createDefaultLayout()];
  }, []);

  const [state, setState] = useState({
    currentTime: 0,
    totalTime: 0,
    remainingTime: 0,
    ontimeCurrent: 0,
    ontimeTitle: "",
    ontimePlayback: "",
    ontimeOnAir: false,
    ontimeExpectedFinish: 0,
    loop: false,
    stopped: false,
    elapsedColor: "",
    remainingColor: "",
    clockColor: "",
    recorders: [] as Array<{
      id: string;
      label: string;
      host: string;
      port: number;
      connected: boolean;
      lastError: string | null;
      status: string;
      recordingSince: number | null;
      displayTimecode: string;
      videoFormat: string;
      clipId: string;
    }>,
    timezoneClocks: [] as Array<{
      id: string;
      label: string;
      timezone: string;
      enabled: boolean;
    }>,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [oscTimers, setOscTimers] = useState<Record<string, OscTimerState>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = window.localStorage.getItem("cgtimer.oscTimers");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [now, setNow] = useState(() => Date.now());
  const [layouts, setLayouts] = useState<SavedLayout[]>(initialLayouts);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(
    initialLayouts[0]?.id ?? ""
  );
  const [draftRoot, setDraftRoot] = useState<LayoutNode | null>(
    initialLayouts[0]?.root ?? null
  );
  const layoutsRef = useRef<SavedLayout[]>(initialLayouts);
  const [configuringWidgetId, setConfiguringWidgetId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [showEditor, setShowEditor] = useState(false);
  const [dockState, setDockState] = useState(() => {
    const baseWidth =
      typeof window !== "undefined"
        ? Math.max(240, Math.round(window.innerWidth * 0.2))
        : 260;
    return { x: 12, y: 12, width: baseWidth };
  });
  const dockDragRef = useRef<{ dx: number; dy: number } | null>(null);
  const dockResizeRef = useRef<{ startWidth: number; startX: number } | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saveAsValue, setSaveAsValue] = useState("");
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data) setActiveDrag(data);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const data = event.active.data.current as DragData | undefined;
    const overId = event.over?.id;
    if (!data || !overId) return;

    if (overId === "root") {
      // Empty-layout drop: only valid for palette additions
      if (data.kind === "palette") {
        setDraftRoot(makeWidget(data.widgetKey, buildDefaultSettings(data.widgetKey)));
      }
      return;
    }

    const match = String(overId).match(/^edge:([^:]+):(left|right|top|bottom)$/);
    if (!match) return;
    const [, targetId, edge] = match;
    if (data.kind === "move" && data.widgetId === targetId) return;

    if (data.kind === "palette") {
      setDraftRoot((prev) =>
        insertAtEdge(
          prev,
          targetId,
          edge as Edge,
          makeWidget(data.widgetKey, buildDefaultSettings(data.widgetKey))
        )
      );
      return;
    }

    // move existing widget
    setDraftRoot((prev) => {
      const sourceWidget = findWidget(prev, data.widgetId);
      if (!sourceWidget) return prev;
      const withoutSource = removeNode(prev, data.widgetId);
      // Target may have collapsed; ensure it still exists
      if (!findWidget(withoutSource, targetId)) {
        // Fallback: append to root
        return appendToRoot(withoutSource, { ...sourceWidget });
      }
      return insertAtEdge(withoutSource, targetId, edge as Edge, {
        ...sourceWidget,
      });
    });
  };

  const isEditing = showEditor && mode === "edit";

  useEffect(() => {
    window.api.send("window:get-fullscreen-state");
    const fullscreenListener = (_event: unknown, fullscreen: boolean) => {
      setIsFullscreen(fullscreen);
    };
    window.api.receive("window:fullscreen-state", fullscreenListener);
    return () => {
      window.api.removeListener("window:fullscreen-state", fullscreenListener);
    };
  }, []);

  // Auto-hide the window menu bar after 3s of mouse/keyboard inactivity;
  // any movement re-shows it. macOS uses a system-level menu bar so this
  // toggle is a no-op there and we skip it. While the layout editor is open
  // we also pin the bar visible so menu actions stay accessible.
  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      /mac/i.test(navigator.platform || navigator.userAgent || "");
    if (isMac) return;

    if (isEditing) {
      window.api.send("menubar:set-visible", true);
      return;
    }

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let visible = true;
    let suppressUntil = 0;
    window.api.send("menubar:set-visible", true);

    const armIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        window.api.send("menubar:set-visible", false);
        visible = false;
        // Hiding the menu bar reflows the window, which produces synthetic
        // mousemove events under the cursor. Ignore them briefly so the bar
        // doesn't immediately bounce back on.
        suppressUntil = Date.now() + 400;
      }, 3000);
    };

    const wake = () => {
      if (Date.now() < suppressUntil) return;
      if (!visible) {
        window.api.send("menubar:set-visible", true);
        visible = true;
      }
      armIdle();
    };

    armIdle();
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      if (idleTimer) clearTimeout(idleTimer);
      window.api.send("menubar:set-visible", true);
    };
  }, [isEditing]);

  useEffect(() => {
    const displayResetListener = () => {
      setState({
        currentTime: 0,
        totalTime: 0,
        remainingTime: 0,
        ontimeCurrent: 0,
        ontimeTitle: "",
        ontimePlayback: "",
        ontimeOnAir: false,
        ontimeExpectedFinish: 0,
        loop: false,
        stopped: false,
        elapsedColor: "",
        remainingColor: "",
        clockColor: "",
        recorders: [],
        timezoneClocks: [],
      });
    };

    const timersListener = (_event: unknown, arg: Partial<typeof state>) => {
      setState((prev) => ({ ...prev, ...arg }));
    };

    window.api.receive("display:reset", displayResetListener);
    window.api.receive("timers:update", timersListener);

    return () => {
      window.api.removeListener("display:reset", displayResetListener);
      window.api.removeListener("timers:update", timersListener);
    };
  }, []);

  useEffect(() => {
    const openEditor = () => {
      setShowEditor(true);
      setMode("edit");
    };
    window.api.receive("layout:edit", openEditor);
    return () => {
      window.api.removeListener("layout:edit", openEditor);
    };
  }, []);

  const Status = { RUNNING: 0, HALFWAY: 1, ENDING: 2, ENDED: 3 };

  const status = () => {
    if (state.remainingTime <= 0) return Status.ENDED;
    if (state.remainingTime <= state.totalTime / 4) return Status.ENDING;
    if (state.remainingTime <= state.totalTime / 2) return Status.HALFWAY;
    return Status.RUNNING;
  };

  const remainingTimeColor = () => {
    switch (status()) {
      case Status.RUNNING:
        return state.remainingColor;
      case Status.HALFWAY:
        return "orange";
      case Status.ENDING:
      case Status.ENDED:
        return "red";
      default:
        return state.remainingColor;
    }
  };

  const handleToggleFullscreen = () => {
    window.api.send("window:toggle-fullscreen");
  };

  // "F" toggles fullscreen, except while typing in an input field or
  // when a modifier is held (so Ctrl-F / Cmd-F still work normally).
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "f" && event.key !== "F") return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      event.preventDefault();
      window.api.send("window:toggle-fullscreen");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const selectedLayout = useMemo(
    () => layouts.find((l) => l.id === selectedLayoutId) ?? layouts[0],
    [layouts, selectedLayoutId]
  );

  useEffect(() => {
    if (selectedLayout) setDraftRoot(selectedLayout.root);
  }, [selectedLayout]);

  useEffect(() => {
    layoutsRef.current = layouts;
    if (!layouts.length) return;
    persistLayouts(layouts);
    if (typeof window !== "undefined" && window.api?.send) {
      window.api.send(
        "layouts:update",
        layouts.map((layout) => layout.name)
      );
    }
  }, [layouts]);

  useEffect(() => {
    if (mode !== "edit" || !showEditor) setConfiguringWidgetId(null);
  }, [mode, showEditor]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (dockDragRef.current) {
        setDockState((prev) => {
          const x = event.clientX - dockDragRef.current!.dx;
          const y = event.clientY - dockDragRef.current!.dy;
          return { ...prev, x: Math.max(8, x), y: Math.max(8, y) };
        });
      } else if (dockResizeRef.current) {
        const delta = event.clientX - dockResizeRef.current.startX;
        setDockState((prev) => ({
          ...prev,
          width: Math.max(240, dockResizeRef.current!.startWidth + delta),
        }));
      }
    };
    const handleMouseUp = () => {
      dockDragRef.current = null;
      dockResizeRef.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const handleLayoutLoad = (_event: unknown, layoutName: string) => {
      const target = layoutsRef.current.find(
        (layout) => layout.name.toLowerCase() === String(layoutName).toLowerCase()
      );
      if (!target) return;
      setSelectedLayoutId(target.id);
      setDraftRoot(target.root);
      setMode("preview");
      setShowEditor(false);
    };
    window.api.receive("layout:load", handleLayoutLoad);
    return () => {
      window.api.removeListener("layout:load", handleLayoutLoad);
    };
  }, []);

  // Single wall-clock-aligned 1Hz tick that drives every clock/timer in the UI.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const align = 1000 - (Date.now() % 1000);
    const timeout = setTimeout(() => {
      setNow(Date.now());
      interval = setInterval(() => setNow(Date.now()), 1000);
    }, align);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cgtimer.oscTimers", JSON.stringify(oscTimers));
  }, [oscTimers]);

  useEffect(() => {
    const handleTimerCommand = (
      _event: unknown,
      { name, action, value }: { name: string; action: string; value?: number }
    ) => {
      setOscTimers((prev) => {
        const timer = prev[name] || { startedAt: null, elapsed: 0 };
        const now = Date.now();
        switch (action) {
          case "start":
            if (timer.startedAt) return prev;
            return { ...prev, [name]: { ...timer, startedAt: now } };
          case "stop":
            if (!timer.startedAt) return prev;
            return {
              ...prev,
              [name]: {
                startedAt: null,
                elapsed: timer.elapsed + (now - timer.startedAt),
              },
            };
          case "reset":
            return { ...prev, [name]: { startedAt: null, elapsed: 0 } };
          case "toggle":
            if (timer.startedAt) {
              return {
                ...prev,
                [name]: {
                  startedAt: null,
                  elapsed: timer.elapsed + (now - timer.startedAt),
                },
              };
            } else {
              return { ...prev, [name]: { ...timer, startedAt: now } };
            }
          case "set":
            return { ...prev, [name]: { startedAt: null, elapsed: value ?? 0 } };
          default:
            return prev;
        }
      });
    };
    window.api.receive("osc-timer:command", handleTimerCommand);
    return () => {
      window.api.removeListener("osc-timer:command", handleTimerCommand);
    };
  }, []);

  const handleDockDragStart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dockDragRef.current = {
      dx: event.clientX - dockState.x,
      dy: event.clientY - dockState.y,
    };
  };

  const handleDockResizeStart = (event: React.MouseEvent) => {
    dockResizeRef.current = { startWidth: dockState.width, startX: event.clientX };
    event.stopPropagation();
  };

  const buildDefaultSettings = (widgetKey: WidgetKind): WidgetSettings | undefined => {
    if (widgetKey === "worldClock") {
      const defaultTimezoneId =
        state.timezoneClocks.find((tz) => tz.enabled)?.id ||
        state.timezoneClocks[0]?.id;
      return { timezoneId: defaultTimezoneId };
    }
    if (widgetKey === "oscTimer") {
      return { oscTimerName: `timer${generateId().slice(0, 4)}` };
    }
    if (widgetKey === "timeOfDayCountdown") {
      return { targetTime: "20:00:00" };
    }
    if (widgetKey === "recorderStatus") {
      const first = state.recorders[0];
      return { recorderId: first?.id };
    }
    return undefined;
  };

  const handleAddWidget = (widgetKey: WidgetKind) => {
    const widget = makeWidget(widgetKey, buildDefaultSettings(widgetKey));
    setDraftRoot((prev) => appendToRoot(prev, widget, "horizontal"));
  };

  const handleSplitWidget = (
    widgetId: string,
    direction: "horizontal" | "vertical",
    widgetKey: WidgetKind
  ) => {
    setDraftRoot((prev) => {
      const widget = makeWidget(widgetKey, buildDefaultSettings(widgetKey));
      return splitWidgetAt(prev, widgetId, direction, "after", widget);
    });
  };

  const handleUpdateWidgetSettings = (id: string, updates: WidgetSettings) => {
    setDraftRoot((prev) => updateWidgetSettings(prev, id, updates));
  };

  const handleRemoveWidget = (id: string) => {
    if (configuringWidgetId === id) setConfiguringWidgetId(null);
    setDraftRoot((prev) => removeNode(prev, id));
  };

  const handleSplitSizes = (splitId: string, sizes: number[]) => {
    setDraftRoot((prev) => updateSplitSizes(prev, splitId, sizes));
  };

  const handleSaveLayout = () => {
    if (!selectedLayout) {
      const fallback: SavedLayout = {
        id: generateId(),
        name: "Layout",
        updatedAt: Date.now(),
        root: draftRoot,
      };
      setLayouts([fallback]);
      setSelectedLayoutId(fallback.id);
      setMode("preview");
      setShowEditor(false);
      return;
    }
    const updated = layouts.map((layout) =>
      layout.id === selectedLayout.id
        ? { ...layout, root: draftRoot, updatedAt: Date.now() }
        : layout
    );
    setLayouts(updated);
    setMode("preview");
    setShowEditor(false);
  };

  const handleSaveAs = () => {
    setSaveAsValue("");
    setSaveAsOpen(true);
  };

  const handleSaveAsSubmit = () => {
    const name = saveAsValue.trim();
    if (!name) return;
    const newLayout: SavedLayout = {
      id: generateId(),
      name,
      updatedAt: Date.now(),
      root: draftRoot,
    };
    setLayouts((prev) => [...prev, newLayout]);
    setSelectedLayoutId(newLayout.id);
    setSaveAsOpen(false);
    setMode("preview");
    setShowEditor(false);
  };

  const handleNewLayout = () => {
    const fresh: SavedLayout = {
      id: generateId(),
      name: "Untitled",
      updatedAt: Date.now(),
      root: null,
    };
    setLayouts((prev) => [...prev, fresh]);
    setSelectedLayoutId(fresh.id);
  };

  const handleDuplicateLayout = () => {
    if (!selectedLayout) return;
    const copy: SavedLayout = {
      ...selectedLayout,
      id: generateId(),
      name: `${selectedLayout.name} copy`,
      updatedAt: Date.now(),
      root: draftRoot ? cloneTreeWithNewIds(draftRoot) : null,
    };
    setLayouts((prev) => [...prev, copy]);
    setSelectedLayoutId(copy.id);
  };

  const handleRenameLayout = () => {
    if (!selectedLayoutId) return;
    const current = layoutsRef.current.find((l) => l.id === selectedLayoutId);
    setRenameTargetId(selectedLayoutId);
    setRenameValue(current?.name ?? "");
  };

  const handleRenameSubmit = () => {
    if (!renameTargetId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setLayouts((prev) =>
      prev.map((layout) =>
        layout.id === renameTargetId
          ? { ...layout, name: trimmed, updatedAt: Date.now() }
          : layout
      )
    );
    setRenameTargetId(null);
  };

  const handleRenameCancel = () => setRenameTargetId(null);

  const handleRequestDelete = () => {
    if (!selectedLayout) return;
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedLayout) {
      setDeleteConfirmOpen(false);
      return;
    }
    const filtered = layouts.filter((layout) => layout.id !== selectedLayout.id);
    const nextLayouts = filtered.length ? filtered : [createDefaultLayout()];
    setLayouts(nextLayouts);
    setSelectedLayoutId(nextLayouts[0]?.id ?? "");
    setDeleteConfirmOpen(false);
  };

  const renderWidgetBody = (node: WidgetNode, isEditing: boolean) => {
    const widget = widgetCatalog[node.widgetKey];
    const colors = getWidgetColors(node.settings);
    const showLabel = node.settings?.showLabel !== false;
    const customLabel = node.settings?.customLabel;
    if (!widget) return <div>Unknown widget</div>;

    if (node.widgetKey === "worldClock") {
      const timezones = state.timezoneClocks;
      const fallbackZone = "UTC";
      const selectedTimezone =
        timezones.find((tz) => tz.id === node.settings?.timezoneId) || timezones[0];
      const activeZone = selectedTimezone?.timezone ?? fallbackZone;
      const activeLabel = selectedTimezone?.label ?? fallbackZone;
      const defaultLabel = `${activeLabel} (${getTimezoneOffset(activeZone)})`;
      const time = getTimezoneTime(activeZone, now);

      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {isEditing && (
            <div className={styles.widgetControl}>
              <Dropdown
                size="small"
                value={selectedTimezone?.label ?? "Local time"}
                selectedOptions={[selectedTimezone?.id ?? ""]}
                onOptionSelect={(_e, data) => {
                  if (data.optionValue === "__manage__") {
                    window.api.send("preferences:open", "timezones");
                    return;
                  }
                  handleUpdateWidgetSettings(node.id, {
                    timezoneId: data.optionValue || undefined,
                  });
                }}
              >
                <Option value="">Local time</Option>
                {timezones.map((tz) => (
                  <Option key={tz.id} value={tz.id} text={tz.label}>
                    {tz.label}
                  </Option>
                ))}
                <Option value="__manage__" text="Manage timezones…">
                  Manage timezones…
                </Option>
              </Dropdown>
            </div>
          )}
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || defaultLabel}
            </h1>
          )}
          <div
            className="clock-face"
            style={{ color: colors.faceColor ?? state.clockColor }}
          >
            {time}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "localClock") {
      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || "Local Clock"}
            </h1>
          )}
          <div
            className="clock-face"
            style={{ color: colors.faceColor ?? state.clockColor }}
          >
            {clockTime(now)}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "timeOfDayCountdown") {
      const target = node.settings?.targetTime || "20:00:00";
      const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(target);
      let display = "--:--:--";
      let overdue = false;
      if (match) {
        const targetDate = new Date(now);
        targetDate.setHours(
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3], 10),
          0
        );
        const diffMs = targetDate.getTime() - now;
        overdue = diffMs < 0;
        const absSeconds = Math.floor(Math.abs(diffMs) / 1000);
        const hh = String(Math.floor(absSeconds / 3600)).padStart(2, "0");
        const mm = String(Math.floor((absSeconds % 3600) / 60)).padStart(2, "0");
        const ss = String(absSeconds % 60).padStart(2, "0");
        display = `${overdue ? "+" : ""}${hh}:${mm}:${ss}`;
      }

      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {isEditing && (
            <div className={styles.widgetControl}>
              <Input
                size="small"
                value={target}
                placeholder="HH:MM:SS"
                onChange={(_e, data) =>
                  handleUpdateWidgetSettings(node.id, {
                    targetTime: data.value || undefined,
                  })
                }
              />
            </div>
          )}
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || `Until ${target}`}
            </h1>
          )}
          <div
            className="clock-face"
            style={{
              color: colors.faceColor ?? (overdue ? "red" : state.clockColor),
            }}
          >
            {display}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "loopState") {
      const loopColor = state.loop ? "lime" : "#888";
      const loopAriaLabel = state.loop ? "Loop enabled" : "Loop disabled";
      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || "Loop"}
            </h1>
          )}
          <div
            className="clock-face"
            style={{ color: colors.faceColor ?? loopColor }}
            aria-label={loopAriaLabel}
            title={loopAriaLabel}
          >
            {state.loop ? (
              <ArrowRepeatAllRegular className="loop-active" />
            ) : (
              <ProhibitedRegular />
            )}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "primaryTimer") {
      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || "Remaining"}
            </h1>
          )}
          <div
            className="clock-face"
            style={{ color: colors.faceColor ?? remainingTimeColor() }}
          >
            {toTime(state.remainingTime)}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "secondaryTimer") {
      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || "Elapsed"}
            </h1>
          )}
          <div
            className="clock-face"
            style={{ color: colors.faceColor ?? state.elapsedColor }}
          >
            {toTime(state.currentTime)}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "oscTimer") {
      const timerName = node.settings?.oscTimerName || "default";
      const timer = oscTimers[timerName] || { startedAt: null, elapsed: 0 };
      const displayTimeMs = timer.startedAt
        ? timer.elapsed + (now - timer.startedAt)
        : timer.elapsed;
      const displayTime = new Date(displayTimeMs).toISOString().substr(11, 8);

      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {isEditing && (
            <div className={styles.widgetControl}>
              <Input
                size="small"
                value={timerName}
                placeholder="default"
                onChange={(_e, data) =>
                  handleUpdateWidgetSettings(node.id, {
                    oscTimerName: data.value || undefined,
                  })
                }
              />
            </div>
          )}
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || timerName}
            </h1>
          )}
          <div
            className="clock-face"
            style={{ color: colors.faceColor ?? state.clockColor }}
          >
            {displayTime}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "ontimeTimer") {
      const value = state.ontimeCurrent || 0;
      const overtime = value < 0;
      const display = Utils.msToTime(value);
      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || "Ontime"}
            </h1>
          )}
          <div
            className="clock-face"
            style={{
              color: colors.faceColor ?? (overtime ? "red" : state.clockColor),
            }}
          >
            {display}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "ontimeTitle") {
      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || "Now"}
            </h1>
          )}
          <div
            className="clock-face"
            style={{
              color: colors.faceColor ?? state.clockColor,
              fontFamily: "inherit",
              fontSize: "min(8cqw, 18cqh)",
              padding: "0 4cqw",
            }}
          >
            {state.ontimeTitle || "—"}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "ontimePlayback") {
      const playback = (state.ontimePlayback || "").toLowerCase();
      const playbackIcon = (() => {
        switch (playback) {
          case "play":
          case "playing":
          case "roll":
            return <PlayRegular />;
          case "pause":
          case "paused":
            return <PauseRegular />;
          case "stop":
          case "stopped":
            return <StopRegular />;
          case "armed":
            return <RecordRegular />;
          default:
            return <ProhibitedRegular />;
        }
      })();
      const playbackLabel =
        playback ? playback.charAt(0).toUpperCase() + playback.slice(1) : "—";
      const playbackColor = (() => {
        if (playback === "play" || playback === "playing" || playback === "roll")
          return "#22c55e";
        if (playback === "armed") return "#dc2626";
        if (playback === "pause" || playback === "paused") return "#f59e0b";
        return "#888";
      })();
      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || playbackLabel}
            </h1>
          )}
          <div
            className="clock-face"
            style={{ color: colors.faceColor ?? playbackColor }}
            aria-label={`Playback: ${playbackLabel}`}
            title={`Playback: ${playbackLabel}`}
          >
            {playbackIcon}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "ontimeOnAir") {
      const onAir = state.ontimeOnAir;
      return (
        <div
          className={`monitor${onAir ? " ending" : ""}`}
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || (onAir ? "ON AIR" : "OFF AIR")}
            </h1>
          )}
          <div
            className="clock-face"
            style={{
              color: colors.faceColor ?? (onAir ? "#dc2626" : "#555"),
              fontFamily: "inherit",
              fontWeight: 700,
              letterSpacing: "0.1em",
              fontSize: "min(14cqw, 35cqh)",
            }}
            aria-label={onAir ? "On air" : "Off air"}
          >
            {onAir ? "● LIVE" : "OFF"}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "ontimeExpectedFinish") {
      const ms = state.ontimeExpectedFinish || 0;
      // Ontime sends an absolute "ms-from-midnight" value; render as wall-clock
      const display = ms > 0 ? Utils.msToTime(ms) : "--:--:--";
      return (
        <div
          className="monitor"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {customLabel || "Expected finish"}
            </h1>
          )}
          <div
            className="clock-face"
            style={{ color: colors.faceColor ?? state.clockColor }}
          >
            {display}
          </div>
        </div>
      );
    }

    if (node.widgetKey === "recorderStatus") {
      const recorders = state.recorders;
      const recorder =
        recorders.find((r) => r.id === node.settings?.recorderId) ||
        recorders[0];
      const recording = recorder?.status === "record";
      // HyperDeck reports timecode as HH:MM:SS:FF or HH:MM:SS;FF (drop-frame).
      // Strip the frame portion so the widget shows the same HH:MM:SS as our other timers.
      const tcMatch = /^(\d{2}:\d{2}:\d{2})[:;]\d{2}/.exec(recorder?.displayTimecode || "");
      const display = recording
        ? tcMatch?.[1] ?? "00:00:00"
        : recorder
        ? recorder.connected
          ? "ST:ND:BY"
          : "OF:FL:NE"
        : "—";
      const labelText =
        customLabel || recorder?.label || "HyperDeck";

      return (
        <div
          className={`monitor${recording ? " ending" : ""}`}
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          {isEditing && (
            <div className={styles.widgetControl}>
              <Dropdown
                size="small"
                value={recorder?.label ?? "Pick a recorder"}
                selectedOptions={[recorder?.id ?? ""]}
                onOptionSelect={(_e, data) => {
                  if (data.optionValue === "__manage__") {
                    window.api.send("preferences:open", "recorders");
                    return;
                  }
                  handleUpdateWidgetSettings(node.id, {
                    recorderId: data.optionValue || undefined,
                  });
                }}
              >
                {recorders.map((r) => (
                  <Option key={r.id} value={r.id} text={r.label}>
                    {r.label}
                  </Option>
                ))}
                <Option value="__manage__" text="Manage recorders…">
                  Manage recorders…
                </Option>
              </Dropdown>
            </div>
          )}
          {showLabel && (
            <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
              {labelText}
            </h1>
          )}
          {recording && (
            <span
              style={{
                position: "absolute",
                top: "3cqh",
                right: "3cqw",
                fontFamily: "system-ui, sans-serif",
                color: "#dc2626",
                fontSize: "min(5cqw, 18cqh)",
                lineHeight: 1,
                pointerEvents: "none",
              }}
            >
              ●
            </span>
          )}
          <div
            className="clock-face"
            style={{ color: colors.faceColor ?? state.clockColor }}
          >
            {display}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderWidget = (node: WidgetNode) => {
    const widget = widgetCatalog[node.widgetKey];
    const widgetLabel = widget?.label ?? "Widget";

    const titleBlock = (
      <div>
        <Body1Strong className={styles.widgetCardTitle}>{widgetLabel}</Body1Strong>
        <Caption1 className={styles.widgetCardSubtitle} block>
          {widget?.description}
        </Caption1>
      </div>
    );

    const actions = isEditing ? (
      <div className={styles.widgetCardActions}>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Tooltip content="Split right" relationship="label" withArrow>
              <Button
                appearance="subtle"
                size="small"
                icon={<SplitVerticalRegular />}
                aria-label="Split right"
              />
            </Tooltip>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {Object.values(widgetCatalog).map((w) => (
                <MenuItem
                  key={w.key}
                  onClick={() => handleSplitWidget(node.id, "horizontal", w.key)}
                >
                  {w.label}
                </MenuItem>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Tooltip content="Split down" relationship="label" withArrow>
              <Button
                appearance="subtle"
                size="small"
                icon={<SplitHorizontalRegular />}
                aria-label="Split down"
              />
            </Tooltip>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {Object.values(widgetCatalog).map((w) => (
                <MenuItem
                  key={w.key}
                  onClick={() => handleSplitWidget(node.id, "vertical", w.key)}
                >
                  {w.label}
                </MenuItem>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
        <Popover
          open={configuringWidgetId === node.id}
          onOpenChange={(_e, data) =>
            setConfiguringWidgetId(data.open ? node.id : null)
          }
          positioning="below-end"
          trapFocus
        >
          <PopoverTrigger disableButtonEnhancement>
            <Button
              appearance="subtle"
              size="small"
              icon={<ColorRegular />}
              aria-label="Configure widget"
            />
          </PopoverTrigger>
          <PopoverSurface>
            <ColorConfigPanel
              node={node}
              onChange={(updates) => handleUpdateWidgetSettings(node.id, updates)}
              onClose={() => setConfiguringWidgetId(null)}
            />
          </PopoverSurface>
        </Popover>
        <Button
          appearance="subtle"
          size="small"
          icon={<DismissRegular />}
          aria-label="Remove widget"
          onClick={() => handleRemoveWidget(node.id)}
        />
      </div>
    ) : null;

    const header = isEditing ? (
      <Draggable
        id={`move:${node.id}`}
        data={{
          kind: "move",
          widgetId: node.id,
          widgetKey: node.widgetKey,
          label: widgetLabel,
        }}
        className={mergeClasses(
          styles.widgetCardHeader,
          styles.widgetCardHeaderDraggable
        )}
      >
        {titleBlock}
        {actions}
      </Draggable>
    ) : (
      <div className={styles.widgetCardHeader}>
        {titleBlock}
        {actions}
      </div>
    );

    const isDragSource =
      activeDrag?.kind === "move" && activeDrag.widgetId === node.id;
    const dropZonesActive = isEditing && !!activeDrag && !isDragSource;

    return (
      <div
        className={mergeClasses(
          styles.widgetCard,
          !showEditor && styles.widgetCardDisplay
        )}
        style={{ position: "relative" }}
      >
        {showEditor && header}
        <div className={styles.widgetCardBody}>{renderWidgetBody(node, isEditing)}</div>
        {dropZonesActive && (
          <div className={styles.dropZoneOverlay}>
            <Droppable
              id={`edge:${node.id}:left`}
              className={mergeClasses(styles.dropZone, styles.dropZoneLeft)}
              activeClassName={styles.dropZoneActive}
            />
            <Droppable
              id={`edge:${node.id}:right`}
              className={mergeClasses(styles.dropZone, styles.dropZoneRight)}
              activeClassName={styles.dropZoneActive}
            />
            <Droppable
              id={`edge:${node.id}:top`}
              className={mergeClasses(styles.dropZone, styles.dropZoneTop)}
              activeClassName={styles.dropZoneActive}
            />
            <Droppable
              id={`edge:${node.id}:bottom`}
              className={mergeClasses(styles.dropZone, styles.dropZoneBottom)}
              activeClassName={styles.dropZoneActive}
            />
          </div>
        )}
      </div>
    );
  };

  const renderNode = (node: LayoutNode): React.ReactNode => {
    if (node.type === "widget") return renderWidget(node);
    return (
      <PanelGroup
        key={node.id}
        direction={node.direction}
        style={{ flex: 1, minHeight: 0 }}
        onLayout={(sizes) => handleSplitSizes(node.id, sizes)}
      >
        {node.children.map((child, i) => (
          <React.Fragment key={child.id}>
            {i > 0 && (
              <PanelResizeHandle
                className={
                  node.direction === "horizontal"
                    ? styles.resizeHandleHorizontal
                    : styles.resizeHandleVertical
                }
              />
            )}
            <Panel
              id={child.id}
              order={i}
              defaultSize={node.sizes[i] ?? 100 / node.children.length}
              minSize={5}
            >
              {renderNode(child)}
            </Panel>
          </React.Fragment>
        ))}
      </PanelGroup>
    );
  };

  const surfaceContent =
    draftRoot === null ? (
      isEditing ? (
        <Droppable
          id="root"
          className={styles.rootDropZone}
          activeClassName={styles.rootDropZoneActive}
        >
          <div className={styles.emptyPlaceholderInner}>
            <Body1Strong>Layout is empty</Body1Strong>
            <Caption1>
              Drag a widget from the dock here, or click one to add it.
            </Caption1>
          </div>
        </Droppable>
      ) : (
        <div className={styles.emptySurface}>
          <Body1Strong>No widgets in this layout</Body1Strong>
          <Caption1>Open the layout editor (Ctrl/Cmd+E) to add widgets.</Caption1>
        </div>
      )
    ) : draftRoot.type === "widget" ? (
      // Single-widget root: wrap in a single-panel group so resizing semantics stay consistent
      <PanelGroup direction="horizontal" style={{ flex: 1, minHeight: 0 }}>
        <Panel id={draftRoot.id} order={0} defaultSize={100} minSize={5}>
          {renderNode(draftRoot)}
        </Panel>
      </PanelGroup>
    ) : (
      renderNode(draftRoot)
    );

  const renderDock = () => (
    <div
      className={styles.dock}
      style={{ left: dockState.x, top: dockState.y, width: dockState.width }}
    >
      <div className={styles.dockHandle} onMouseDown={handleDockDragStart}>
        <ReOrderRegular fontSize={14} />
        <span>Layout controls</span>
      </div>

      <div className={styles.dockSection}>
        <Field label="Layout" style={{ minWidth: 0 }}>
          <Dropdown
            style={{ minWidth: 0, width: "100%" }}
            listbox={{ style: { minWidth: 0 } }}
            value={selectedLayout?.name ?? ""}
            selectedOptions={selectedLayout ? [selectedLayout.id] : []}
            onOptionSelect={(_e, data) => {
              if (data.optionValue) setSelectedLayoutId(data.optionValue);
            }}
          >
            {layouts.map((layout) => (
              <Option key={layout.id} value={layout.id} text={layout.name}>
                {layout.name}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Caption1 className={styles.dockMeta}>
          Last saved:{" "}
          {selectedLayout?.updatedAt
            ? new Date(selectedLayout.updatedAt).toLocaleString()
            : "--"}
        </Caption1>
      </div>

      <div className={styles.dockButtonRow}>
        <Button
          appearance="primary"
          icon={<SaveRegular />}
          onClick={handleSaveLayout}
        >
          Save
        </Button>
        <Button
          appearance={mode === "edit" ? "secondary" : "outline"}
          icon={mode === "edit" ? <EyeRegular /> : <EditRegular />}
          onClick={() => setMode((prev) => (prev === "edit" ? "preview" : "edit"))}
        >
          {mode === "edit" ? "Preview" : "Edit"}
        </Button>
        <Button icon={<AddRegular />} onClick={handleSaveAs}>
          Save as
        </Button>
        <Button icon={<CopyRegular />} onClick={handleDuplicateLayout}>
          Duplicate
        </Button>
        <Button icon={<RenameRegular />} onClick={handleRenameLayout}>
          Rename
        </Button>
        <Button icon={<DocumentAddRegular />} onClick={handleNewLayout}>
          New
        </Button>
      </div>

      <Button
        appearance="subtle"
        icon={<DeleteRegular />}
        onClick={handleRequestDelete}
      >
        Delete layout
      </Button>

      <div className={styles.paletteScroll}>
        {WIDGET_GROUPS.map((group) => {
          const widgets = Object.values(widgetCatalog).filter(
            (w) => w.group === group.id
          );
          if (!widgets.length) return null;
          return (
            <React.Fragment key={group.id}>
              <Caption1 className={styles.paletteHeading}>{group.label}</Caption1>
              <div className={styles.dockButtonRowSingle}>
                {widgets.map((widget) => (
                  <Draggable
                    key={widget.key}
                    id={`palette:${widget.key}`}
                    data={{
                      kind: "palette",
                      widgetKey: widget.key,
                      label: widget.label,
                    }}
                  >
                    <Tooltip
                      content={`${widget.description} — click or drag onto a widget edge`}
                      relationship="description"
                      withArrow
                    >
                      <Button
                        appearance="secondary"
                        icon={
                          <span
                            style={{ color: widget.color, display: "inline-flex" }}
                          >
                            {widget.icon}
                          </span>
                        }
                        onClick={() => handleAddWidget(widget.key)}
                      >
                        {widget.label}
                      </Button>
                    </Tooltip>
                  </Draggable>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className={styles.dockResize} onMouseDown={handleDockResizeStart} />
    </div>
  );

  return (
    <div
      className="app"
      style={{ position: "relative" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <div className={styles.fullscreenButton}>
          <Tooltip
            content={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            relationship="label"
            withArrow
          >
            <Button
              appearance="subtle"
              size="large"
              icon={
                isFullscreen ? (
                  <FullScreenMinimizeRegular />
                ) : (
                  <FullScreenMaximizeRegular />
                )
              }
              onClick={handleToggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            />
          </Tooltip>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <div className={styles.layoutPanel}>
          {showEditor && renderDock()}

          <div
            className={mergeClasses(
              styles.surface,
              showEditor && styles.surfaceEditing
            )}
          >
            {surfaceContent}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div className={styles.dragOverlayChip}>{activeDrag.label}</div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <PromptDialog
        open={!!renameTargetId}
        title="Rename layout"
        message="Enter a new name for this layout."
        value={renameValue}
        confirmLabel="Save name"
        onChange={setRenameValue}
        onSubmit={handleRenameSubmit}
        onCancel={handleRenameCancel}
      />

      <PromptDialog
        open={saveAsOpen}
        title="Save layout as"
        message="Name for the new layout"
        value={saveAsValue}
        confirmLabel="Save"
        onChange={setSaveAsValue}
        onSubmit={handleSaveAsSubmit}
        onCancel={() => setSaveAsOpen(false)}
      />

      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(_e, data) => {
          if (!data.open) setDeleteConfirmOpen(false);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete layout?</DialogTitle>
            <DialogContent>
              {selectedLayout
                ? `"${selectedLayout.name}" will be permanently removed.`
                : "This layout will be permanently removed."}
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

const cloneTreeWithNewIds = (node: LayoutNode): LayoutNode => {
  if (node.type === "widget") {
    return { ...node, id: generateId() };
  }
  return {
    ...node,
    id: generateId(),
    children: node.children.map(cloneTreeWithNewIds),
  };
};

export default App;
