import React, { useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
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
  Tooltip,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  ArrowRepeatAllRegular,
  ColorRegular,
  CopyRegular,
  DeleteRegular,
  DismissRegular,
  DocumentAddRegular,
  EditRegular,
  EyeRegular,
  FullScreenMaximizeRegular,
  FullScreenMinimizeRegular,
  PauseRegular,
  PlayRegular,
  ProhibitedRegular,
  RecordRegular,
  ReOrderRegular,
  RenameRegular,
  SaveRegular,
  SplitHorizontalRegular,
  SplitVerticalRegular,
  StopRegular,
} from "@fluentui/react-icons";
import { Utils } from "../utils";
import { MonitorWidget } from "./components/MonitorWidget";
import { PromptDialog } from "./components/PromptDialog";
import { Draggable, DragData } from "./components/Draggable";
import { Droppable } from "./components/Droppable";
import { ColorConfigPanel, getWidgetColors } from "./components/ColorConfigPanel";
import {
  Edge,
  LayoutNode,
  SavedLayout,
  WidgetKind,
  WidgetNode,
  WidgetSettings,
} from "./lib/layout-types";
import {
  appendToRoot,
  cloneTreeWithNewIds,
  findWidget,
  generateId,
  insertAtEdge,
  makeWidget,
  removeNode,
  splitWidgetAt,
  updateSplitSizes,
  updateWidgetSettings,
} from "./lib/layout-tree";
import {
  createDefaultLayout,
  loadSavedLayouts,
  persistLayouts,
} from "./lib/layout-storage";
import { WIDGET_GROUPS, widgetCatalog } from "./lib/widget-catalog";
import {
  clockTime,
  getTimezoneOffset,
  getTimezoneTime,
  toDuration,
  toTime,
} from "./lib/time";

type OscTimerState = {
  startedAt: number | null;
  elapsed: number;
};

const RESIZE_HANDLE_PX = 6;

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
    ...shorthands.borderColor(tokens.colorBrandStroke1),
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
  fullscreenButton: {
    position: "absolute",
    bottom: tokens.spacingVerticalL,
    right: tokens.spacingHorizontalL,
    zIndex: 9999,
  },
});

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
    ccgPaused: false,
    ccgActive: false,
    ccgClipName: "",
    ccgBackgroundName: "",
    ccgBackgroundProducer: "",
    ccgBackgroundCued: false,
    ccgFormat: "",
    ccgFramerate: 0,
    displayValues: {} as Record<string, string>,
    casparcg: {
      enabled: false,
      connected: false,
      lastError: null as string | null,
      version: "",
      latencyMs: null as number | null,
      oscSubscribed: null as boolean | null,
    },
    x32: {
      enabled: false,
      connected: false,
      channels: [] as Array<{
        index: number;
        name: string;
        on: boolean;
        fader: number;
        meter: number;
      }>,
    },
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
      slotStatus: string;
      volumeName: string;
      recordingTimeRemaining: number | null;
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
    return window.api.receive("window:fullscreen-state", fullscreenListener);
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
        ccgPaused: false,
        ccgActive: false,
        ccgClipName: "",
        ccgBackgroundName: "",
        ccgBackgroundProducer: "",
        ccgBackgroundCued: false,
        ccgFormat: "",
        ccgFramerate: 0,
        displayValues: {},
        casparcg: {
          enabled: false,
          connected: false,
          lastError: null,
          version: "",
          latencyMs: null,
          oscSubscribed: null,
        },
        x32: {
          enabled: false,
          connected: false,
          channels: [],
        },
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

    const offReset = window.api.receive("display:reset", displayResetListener);
    const offTimers = window.api.receive("timers:update", timersListener);

    return () => {
      offReset();
      offTimers();
    };
  }, []);

  useEffect(() => {
    const openEditor = () => {
      setShowEditor(true);
      setMode("edit");
    };
    return window.api.receive("layout:edit", openEditor);
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

  // Announce the active layout (on startup, switches, and renames) so the
  // main process can feed Companion button feedbacks.
  useEffect(() => {
    if (selectedLayout?.name) {
      window.api.send("layout:active", selectedLayout.name);
    }
  }, [selectedLayout?.name]);

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
    return window.api.receive("layout:load", handleLayoutLoad);
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
    return window.api.receive("osc-timer:command", handleTimerCommand);
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
    if (widgetKey === "recorderStatus" || widgetKey === "recorderMedia") {
      const first = state.recorders[0];
      return { recorderId: first?.id };
    }
    if (widgetKey === "x32Channel" || widgetKey === "x32Meter") {
      return { x32Channel: 1 };
    }
    if (widgetKey === "displayTile") {
      return { displayKey: `value${generateId().slice(0, 4)}` };
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

  const renderRecorderPicker = (
    node: WidgetNode,
    recorder: (typeof state.recorders)[number] | undefined,
    recorders: typeof state.recorders
  ) => (
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
  );

  const x32ChannelLabel = (channelNumber: number) => {
    const channel = state.x32.channels[channelNumber - 1];
    const padded = channelNumber.toString().padStart(2, "0");
    return channel?.name ? `${padded} ${channel.name}` : `Ch ${padded}`;
  };

  const renderX32ChannelPicker = (node: WidgetNode) => {
    const selected = node.settings?.x32Channel ?? 1;
    return (
      <Dropdown
        size="small"
        value={x32ChannelLabel(selected)}
        selectedOptions={[String(selected)]}
        onOptionSelect={(_e, data) => {
          if (data.optionValue === "__manage__") {
            window.api.send("preferences:open", "mixer");
            return;
          }
          const parsed = parseInt(data.optionValue || "", 10);
          if (!isNaN(parsed)) {
            handleUpdateWidgetSettings(node.id, { x32Channel: parsed });
          }
        }}
      >
        {Array.from({ length: 32 }, (_, i) => i + 1).map((i) => (
          <Option key={i} value={String(i)} text={x32ChannelLabel(i)}>
            {x32ChannelLabel(i)}
          </Option>
        ))}
        <Option value="__manage__" text="Configure mixer…">
          Configure mixer…
        </Option>
      </Dropdown>
    );
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
        <MonitorWidget
          label={defaultLabel}
          customLabel={customLabel}
          showLabel={showLabel}
          display={time}
          defaultFaceColor={state.clockColor}
          colors={colors}
          control={
            isEditing ? (
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
            ) : undefined
          }
        />
      );
    }

    if (node.widgetKey === "localClock") {
      return (
        <MonitorWidget
          label="Local Clock"
          customLabel={customLabel}
          showLabel={showLabel}
          display={clockTime(now)}
          defaultFaceColor={state.clockColor}
          colors={colors}
        />
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
        <MonitorWidget
          label={`Until ${target}`}
          customLabel={customLabel}
          showLabel={showLabel}
          display={display}
          defaultFaceColor={overdue ? "red" : state.clockColor}
          colors={colors}
          control={
            isEditing ? (
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
            ) : undefined
          }
        />
      );
    }

    if (node.widgetKey === "loopState") {
      const loopColor = state.loop ? "lime" : "#888";
      const loopAriaLabel = state.loop ? "Loop enabled" : "Loop disabled";
      return (
        <MonitorWidget
          label="Loop"
          customLabel={customLabel}
          showLabel={showLabel}
          display={
            state.loop ? (
              <ArrowRepeatAllRegular className="loop-active" />
            ) : (
              <ProhibitedRegular />
            )
          }
          defaultFaceColor={loopColor}
          colors={colors}
          faceAriaLabel={loopAriaLabel}
          faceTitle={loopAriaLabel}
        />
      );
    }

    if (node.widgetKey === "ccgClipName") {
      const fullName = state.ccgActive ? state.ccgClipName : "";
      const name = fullName.split(/[\\/]/).pop() || fullName;
      return (
        <MonitorWidget
          label="Now Playing"
          customLabel={customLabel}
          showLabel={showLabel}
          display={name || "—"}
          defaultFaceColor={name ? state.clockColor : "#888"}
          colors={colors}
          faceStyle={{
            fontFamily: "inherit",
            fontSize: "min(8cqw, 18cqh)",
            padding: "0 4cqw",
            overflowWrap: "anywhere",
          }}
          faceTitle={fullName || undefined}
        />
      );
    }

    if (node.widgetKey === "ccgPaused") {
      const active = state.ccgActive;
      const paused = active && state.ccgPaused;
      const pausedLabel = active ? (paused ? "Paused" : "Playing") : "No clip";
      const pausedColor = active ? (paused ? "#f59e0b" : "#22c55e") : "#888";
      return (
        <MonitorWidget
          label={pausedLabel}
          customLabel={customLabel}
          showLabel={showLabel}
          display={
            active ? (
              paused ? (
                <PauseRegular />
              ) : (
                <PlayRegular />
              )
            ) : (
              <ProhibitedRegular />
            )
          }
          defaultFaceColor={pausedColor}
          colors={colors}
          faceAriaLabel={pausedLabel}
          faceTitle={pausedLabel}
        />
      );
    }

    if (node.widgetKey === "ccgNextClip") {
      const cued = state.ccgBackgroundCued;
      const cuedName =
        state.ccgBackgroundName.split(/[\\/]/).pop() ||
        state.ccgBackgroundName ||
        state.ccgBackgroundProducer;
      // Flash when the playing clip is about to run out with nothing cued behind it.
      const notCuedUrgent =
        !cued &&
        state.ccgActive &&
        state.remainingTime > 0 &&
        state.remainingTime <= 10;
      return (
        <MonitorWidget
          label="Next"
          customLabel={customLabel}
          showLabel={showLabel}
          display={cued ? cuedName || "CUED" : "NOT CUED"}
          defaultFaceColor={cued ? state.clockColor : "#888"}
          colors={colors}
          ending={notCuedUrgent}
          faceStyle={{
            fontFamily: "inherit",
            fontSize: "min(8cqw, 18cqh)",
            padding: "0 4cqw",
            overflowWrap: "anywhere",
          }}
          faceTitle={cued ? state.ccgBackgroundName || undefined : "Nothing cued"}
        />
      );
    }

    if (node.widgetKey === "ccgProgress") {
      const pct =
        state.totalTime > 0
          ? Math.min(100, Math.max(0, (state.currentTime / state.totalTime) * 100))
          : 0;
      const fill =
        colors.faceColor ||
        (state.totalTime > 0 ? remainingTimeColor() || "#22c55e" : "#555");
      return (
        <MonitorWidget
          label="Progress"
          customLabel={customLabel}
          showLabel={showLabel}
          display={
            <div
              style={{
                width: "84%",
                height: "22cqh",
                backgroundColor: "#333",
                borderRadius: "6px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: fill,
                  transform: `scaleX(${pct / 100})`,
                  transformOrigin: "left",
                  transition: "transform 0.2s linear",
                }}
              />
            </div>
          }
          colors={colors}
          faceAriaLabel={`Clip progress ${Math.round(pct)}%`}
          faceTitle={`Clip progress ${Math.round(pct)}%`}
        />
      );
    }

    if (node.widgetKey === "ccgFormat") {
      const fps =
        state.ccgFramerate > 0
          ? Number.isInteger(state.ccgFramerate)
            ? String(state.ccgFramerate)
            : state.ccgFramerate.toFixed(2)
          : "";
      const display = state.ccgFormat || (fps ? `${fps} fps` : "—");
      return (
        <MonitorWidget
          label="Format"
          customLabel={customLabel}
          showLabel={showLabel}
          display={display}
          defaultFaceColor={state.clockColor}
          colors={colors}
          faceStyle={{
            fontFamily: "inherit",
            fontWeight: 700,
            letterSpacing: "0.05em",
            fontSize: "min(10cqw, 28cqh)",
          }}
          faceTitle={fps ? `${display} (${fps} fps)` : display}
        />
      );
    }

    if (node.widgetKey === "ccgHealth") {
      const cg = state.casparcg;
      const offline = cg.enabled && !cg.connected;
      const display = !cg.enabled
        ? "—"
        : offline
        ? "OFFLINE"
        : cg.latencyMs != null
        ? `${cg.latencyMs} ms`
        : "OK";
      const healthColor = !cg.enabled ? "#888" : offline ? "#dc2626" : "#22c55e";
      const healthTitle = !cg.enabled
        ? "Set the CasparCG server address in Preferences to enable"
        : offline
        ? `Disconnected${cg.lastError ? `: ${cg.lastError}` : ""}`
        : [
            cg.version ? `CasparCG ${cg.version}` : "Connected",
            cg.oscSubscribed === false
              ? "OSC auto-subscribe refused (needs server 2.4+); configure OSC in casparcg.config"
              : cg.oscSubscribed
              ? "OSC subscribed"
              : undefined,
          ]
            .filter(Boolean)
            .join(". ");
      return (
        <MonitorWidget
          label={cg.version ? `CasparCG ${cg.version.split(" ")[0]}` : "CasparCG"}
          customLabel={customLabel}
          showLabel={showLabel}
          display={display}
          defaultFaceColor={healthColor}
          colors={colors}
          ending={offline}
          faceStyle={{
            fontFamily: "inherit",
            fontWeight: 700,
            letterSpacing: "0.05em",
            fontSize: "min(11cqw, 30cqh)",
          }}
          faceAriaLabel={healthTitle}
          faceTitle={healthTitle}
          overlay={
            cg.connected && cg.oscSubscribed === false ? (
              <span
                style={{
                  position: "absolute",
                  top: "3cqh",
                  right: "3cqw",
                  fontFamily: "system-ui, sans-serif",
                  color: "#f59e0b",
                  fontSize: "min(5cqw, 14cqh)",
                  lineHeight: 1,
                  pointerEvents: "none",
                }}
              >
                NO OSC PUSH
              </span>
            ) : undefined
          }
        />
      );
    }

    if (node.widgetKey === "primaryTimer") {
      return (
        <MonitorWidget
          label="Remaining"
          customLabel={customLabel}
          showLabel={showLabel}
          display={toTime(state.remainingTime)}
          defaultFaceColor={remainingTimeColor()}
          colors={colors}
        />
      );
    }

    if (node.widgetKey === "secondaryTimer") {
      return (
        <MonitorWidget
          label="Elapsed"
          customLabel={customLabel}
          showLabel={showLabel}
          display={toTime(state.currentTime)}
          defaultFaceColor={state.elapsedColor}
          colors={colors}
        />
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
        <MonitorWidget
          label={timerName}
          customLabel={customLabel}
          showLabel={showLabel}
          display={displayTime}
          defaultFaceColor={state.clockColor}
          colors={colors}
          control={
            isEditing ? (
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
            ) : undefined
          }
        />
      );
    }

    if (node.widgetKey === "ontimeTimer") {
      const value = state.ontimeCurrent || 0;
      const overtime = value < 0;
      const display = Utils.msToTime(value);
      return (
        <MonitorWidget
          label="Ontime"
          customLabel={customLabel}
          showLabel={showLabel}
          display={display}
          defaultFaceColor={overtime ? "red" : state.clockColor}
          colors={colors}
        />
      );
    }

    if (node.widgetKey === "ontimeTitle") {
      return (
        <MonitorWidget
          label="Now"
          customLabel={customLabel}
          showLabel={showLabel}
          display={state.ontimeTitle || "—"}
          defaultFaceColor={state.clockColor}
          colors={colors}
          faceStyle={{
            fontFamily: "inherit",
            fontSize: "min(8cqw, 18cqh)",
            padding: "0 4cqw",
          }}
        />
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
        <MonitorWidget
          label={playbackLabel}
          customLabel={customLabel}
          showLabel={showLabel}
          display={playbackIcon}
          defaultFaceColor={playbackColor}
          colors={colors}
          faceAriaLabel={`Playback: ${playbackLabel}`}
          faceTitle={`Playback: ${playbackLabel}`}
        />
      );
    }

    if (node.widgetKey === "ontimeOnAir") {
      const onAir = state.ontimeOnAir;
      return (
        <MonitorWidget
          label={onAir ? "ON AIR" : "OFF AIR"}
          customLabel={customLabel}
          showLabel={showLabel}
          display={onAir ? "● LIVE" : "OFF"}
          defaultFaceColor={onAir ? "#dc2626" : "#555"}
          colors={colors}
          ending={onAir}
          faceStyle={{
            fontFamily: "inherit",
            fontWeight: 700,
            letterSpacing: "0.1em",
            fontSize: "min(14cqw, 35cqh)",
          }}
          faceAriaLabel={onAir ? "On air" : "Off air"}
        />
      );
    }

    if (node.widgetKey === "ontimeExpectedFinish") {
      const ms = state.ontimeExpectedFinish || 0;
      // Ontime sends an absolute "ms-from-midnight" value; render as wall-clock
      const display = ms > 0 ? Utils.msToTime(ms) : "--:--:--";
      return (
        <MonitorWidget
          label="Expected finish"
          customLabel={customLabel}
          showLabel={showLabel}
          display={display}
          defaultFaceColor={state.clockColor}
          colors={colors}
        />
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
      return (
        <MonitorWidget
          label={recorder?.label || "HyperDeck"}
          customLabel={customLabel}
          showLabel={showLabel}
          display={display}
          defaultFaceColor={state.clockColor}
          colors={colors}
          ending={recording}
          faceStyle={{ paddingBottom: "6cqh" }}
          control={
            isEditing ? renderRecorderPicker(node, recorder, recorders) : undefined
          }
          overlay={
            recording ? (
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
            ) : undefined
          }
        />
      );
    }

    if (node.widgetKey === "recorderMedia") {
      const recorders = state.recorders;
      const recorder =
        recorders.find((r) => r.id === node.settings?.recorderId) ||
        recorders[0];
      const remaining = recorder?.recordingTimeRemaining;
      const hasMedia =
        !!recorder?.connected &&
        recorder.slotStatus === "mounted" &&
        remaining != null;
      // Below 5 minutes of record capacity is an alarm, not a statistic.
      const low = hasMedia && remaining < 300;
      const mediaTitle = recorder
        ? recorder.connected
          ? hasMedia
            ? `${recorder.volumeName || "Unnamed volume"}: ${toDuration(
                remaining
              )} record time left`
            : `No media mounted (${recorder.slotStatus || "no slot"})`
          : "Recorder offline"
        : undefined;
      return (
        <MonitorWidget
          label={`${recorder?.label || "HyperDeck"} media`}
          customLabel={customLabel}
          showLabel={showLabel}
          display={hasMedia ? toDuration(remaining) : "--:--:--"}
          defaultFaceColor={low ? "red" : state.clockColor}
          colors={colors}
          ending={low}
          faceStyle={{ paddingBottom: "6cqh" }}
          faceTitle={mediaTitle}
          control={
            isEditing ? renderRecorderPicker(node, recorder, recorders) : undefined
          }
        />
      );
    }

    if (node.widgetKey === "recorderAggregate") {
      const recorders = state.recorders;
      const total = recorders.length;
      const recording = recorders.filter((r) => r.status === "record").length;
      const offline = recorders.filter((r) => !r.connected).length;
      const allRecording = total > 0 && recording === total;
      const aggregateColor =
        total === 0
          ? "#888"
          : allRecording
          ? "#dc2626"
          : recording > 0
          ? "#f59e0b"
          : "#555";
      return (
        <MonitorWidget
          label="Recorders"
          customLabel={customLabel}
          showLabel={showLabel}
          display={total === 0 ? "—" : `${recording}/${total} REC`}
          defaultFaceColor={aggregateColor}
          colors={colors}
          ending={allRecording}
          faceStyle={{
            fontFamily: "inherit",
            fontWeight: 700,
            letterSpacing: "0.05em",
            fontSize: "min(12cqw, 35cqh)",
          }}
          faceAriaLabel={`${recording} of ${total} recorders recording, ${offline} offline`}
          faceTitle={`${recording} of ${total} recorders recording, ${offline} offline`}
          overlay={
            offline > 0 ? (
              <span
                style={{
                  position: "absolute",
                  top: "3cqh",
                  right: "3cqw",
                  fontFamily: "system-ui, sans-serif",
                  color: "#f59e0b",
                  fontSize: "min(5cqw, 14cqh)",
                  lineHeight: 1,
                  pointerEvents: "none",
                }}
              >
                {offline} OFFLINE
              </span>
            ) : undefined
          }
        />
      );
    }

    if (node.widgetKey === "displayTile") {
      const key = node.settings?.displayKey || "value";
      const value = state.displayValues[key] ?? "";
      return (
        <MonitorWidget
          label={key}
          customLabel={customLabel}
          showLabel={showLabel}
          display={value || "—"}
          defaultFaceColor={value ? state.clockColor : "#888"}
          colors={colors}
          faceStyle={{
            fontFamily: "inherit",
            fontSize: "min(10cqw, 24cqh)",
            padding: "0 4cqw",
            overflowWrap: "anywhere",
          }}
          faceTitle={`Send /display/${key} <value> to update; no arguments clears it`}
          control={
            isEditing ? (
              <Input
                size="small"
                value={key}
                placeholder="key"
                onChange={(_e, data) =>
                  handleUpdateWidgetSettings(node.id, {
                    displayKey: data.value || undefined,
                  })
                }
              />
            ) : undefined
          }
        />
      );
    }

    if (node.widgetKey === "x32Channel") {
      const chNum = node.settings?.x32Channel ?? 1;
      const channel = state.x32.channels[chNum - 1];
      const live = state.x32.enabled && state.x32.connected && !!channel;
      const display = !state.x32.enabled
        ? "—"
        : !live
        ? "OFFLINE"
        : channel.on
        ? "ON"
        : "MUTED";
      const chColor = !state.x32.enabled
        ? "#888"
        : !live
        ? "#dc2626"
        : channel.on
        ? "#22c55e"
        : "#dc2626";
      const chTitle = !state.x32.enabled
        ? "Set the mixer address in Preferences to enable"
        : !live
        ? "No reply from the console"
        : `${x32ChannelLabel(chNum)}: ${channel.on ? "on" : "muted"}, fader ${Math.round(
            channel.fader * 100
          )}%`;
      return (
        <MonitorWidget
          label={x32ChannelLabel(chNum)}
          customLabel={customLabel}
          showLabel={showLabel}
          display={display}
          defaultFaceColor={chColor}
          colors={colors}
          ending={state.x32.enabled && !live}
          faceStyle={{
            fontFamily: "inherit",
            fontWeight: 700,
            letterSpacing: "0.05em",
            fontSize: "min(12cqw, 35cqh)",
          }}
          faceAriaLabel={chTitle}
          faceTitle={chTitle}
          control={isEditing ? renderX32ChannelPicker(node) : undefined}
        />
      );
    }

    if (node.widgetKey === "x32Meter") {
      const chNum = node.settings?.x32Channel ?? 1;
      const channel = state.x32.channels[chNum - 1];
      const live = state.x32.enabled && state.x32.connected && !!channel;
      // Meter floats are linear [0..1]; show them on a dB scale with a
      // -60 dB floor so quiet-but-present audio still registers.
      const meter = live ? channel.meter : 0;
      const db = meter > 0 ? 20 * Math.log10(meter) : -60;
      const pct = Math.min(100, Math.max(0, ((db + 60) / 60) * 100));
      const fill = pct > 90 ? "#dc2626" : pct > 75 ? "#f59e0b" : "#22c55e";
      const meterTitle = !state.x32.enabled
        ? "Set the mixer address in Preferences to enable"
        : !live
        ? "No reply from the console"
        : `${x32ChannelLabel(chNum)}: ${db <= -60 ? "-inf" : db.toFixed(1)} dB`;
      return (
        <MonitorWidget
          label={x32ChannelLabel(chNum)}
          customLabel={customLabel}
          showLabel={showLabel}
          display={
            <div
              style={{
                width: "22cqw",
                height: "72cqh",
                backgroundColor: "#333",
                borderRadius: "6px",
                overflow: "hidden",
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: fill,
                  transform: `scaleY(${pct / 100})`,
                  transformOrigin: "bottom",
                  transition: "transform 0.15s linear",
                }}
              />
            </div>
          }
          colors={colors}
          faceAriaLabel={meterTitle}
          faceTitle={meterTitle}
          control={isEditing ? renderX32ChannelPicker(node) : undefined}
          overlay={
            live && !channel.on ? (
              <span
                style={{
                  position: "absolute",
                  top: "3cqh",
                  right: "3cqw",
                  fontFamily: "system-ui, sans-serif",
                  color: "#dc2626",
                  fontSize: "min(5cqw, 14cqh)",
                  lineHeight: 1,
                  pointerEvents: "none",
                }}
              >
                MUTED
              </span>
            ) : undefined
          }
        />
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

export default App;
