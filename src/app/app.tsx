import React, { useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";
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
  ColorRegular,
  CopyRegular,
  DeleteRegular,
  DismissRegular,
  DocumentAddRegular,
  EditRegular,
  EyeRegular,
  FullScreenMaximizeRegular,
  FullScreenMinimizeRegular,
  ProhibitedRegular,
  ReOrderRegular,
  RenameRegular,
  SaveRegular,
} from "@fluentui/react-icons";
import { Utils } from "../utils";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

type WidgetKind =
  | "worldClock"
  | "localClock"
  | "primaryTimer"
  | "secondaryTimer"
  | "productionTimer"
  | "loopState"
  | "oscTimer";

type WidgetDefinition = {
  key: WidgetKind;
  label: string;
  description: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
};

type WidgetLayoutItem = Layout & {
  widgetKey: WidgetKind;
  settings?: {
    timezoneId?: string;
    labelColor?: string;
    faceColor?: string;
    backgroundColor?: string;
    showLabel?: boolean;
    customLabel?: string;
    oscTimerName?: string;
  };
};

type OscTimerState = {
  startedAt: number | null;
  elapsed: number;
};

type SavedLayout = {
  id: string;
  name: string;
  items: WidgetLayoutItem[];
  updatedAt: number;
};

type TimerMonitorProps = {
  title: string;
  value: React.ReactNode;
  color?: string;
  labelColor?: string;
  backgroundColor?: string;
  className?: string;
  faceClassName?: string;
  showLabel?: boolean;
};

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
  gridArea: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  gridAreaEditing: {
    ...shorthands.border("1px", "dashed", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  widgetCard: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  widgetCardDisplay: {
    backgroundColor: "transparent",
    ...shorthands.borderStyle("none"),
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
    cursor: "move",
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

const TimerMonitor = ({
  title,
  value,
  color,
  labelColor,
  backgroundColor,
  className = "",
  faceClassName = "",
  showLabel = true,
}: TimerMonitorProps) => {
  const containerClass = ["monitor", className].filter(Boolean).join(" ");
  const faceClass = ["clock-face", faceClassName].filter(Boolean).join(" ");
  return (
    <div
      className={containerClass}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {showLabel && (
        <h1 style={labelColor ? { color: labelColor } : undefined}>{title}</h1>
      )}
      <div className={faceClass} style={{ color }}>
        {value}
      </div>
    </div>
  );
};

const getWidgetColors = (
  settings?: WidgetLayoutItem["settings"]
): { labelColor?: string; faceColor?: string; backgroundColor?: string } => ({
  labelColor: settings?.labelColor || undefined,
  faceColor: settings?.faceColor || undefined,
  backgroundColor: settings?.backgroundColor || undefined,
});

type ColorConfigPanelProps = {
  item: WidgetLayoutItem;
  onChange: (updates: WidgetLayoutItem["settings"]) => void;
  onClose: () => void;
};

const ColorConfigPanel = ({ item, onChange, onClose }: ColorConfigPanelProps) => {
  const styles = useStyles();
  const colors = getWidgetColors(item.settings);
  const showLabel = item.settings?.showLabel !== false;
  const customLabel = item.settings?.customLabel ?? "";

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

      <Field label="Custom label">
        <Input
          value={customLabel}
          placeholder="Default"
          disabled={!showLabel}
          onChange={(_e, data) =>
            onChange({ customLabel: data.value || undefined })
          }
        />
      </Field>

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
        <Caption1>Clock face</Caption1>
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

function clockTime() {
  const date = new Date();
  const timeZoneOffset = date.getTimezoneOffset() * 60 * 1000;
  const timeZoneDate = new Date(date.getTime() - timeZoneOffset);
  return timeZoneDate.toISOString().substr(11, 8);
}

function getTimezoneTime(timezone: string): string {
  try {
    const date = new Date();
    const timeString = date.toLocaleString("en-US", {
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

const STORAGE_KEY = "cgtimer.widgetLayouts.v1";
const GRID_COLS = 12;

const widgetCatalog: Record<WidgetKind, WidgetDefinition> = {
  worldClock: {
    key: "worldClock",
    label: "World Clock",
    description: "Pick a configured timezone and pin it here",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  localClock: {
    key: "localClock",
    label: "Local Clock",
    description: "Shows the local system time",
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  primaryTimer: {
    key: "primaryTimer",
    label: "Remaining Timer",
    description: "Shows remaining time",
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 3 },
  },
  secondaryTimer: {
    key: "secondaryTimer",
    label: "Elapsed Timer",
    description: "Shows elapsed time",
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 3 },
  },
  productionTimer: {
    key: "productionTimer",
    label: "Production Timer",
    description: "Displays production runtime or on-time if enabled",
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 3 },
  },
  loopState: {
    key: "loopState",
    label: "Loop State",
    description: "Quick indicator for loop mode",
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  oscTimer: {
    key: "oscTimer",
    label: "OSC Timer",
    description: "Stopwatch triggered via OSC commands",
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 3 },
  },
};

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

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

const normalizeLayoutSet = (layouts: SavedLayout[]): SavedLayout[] => layouts;

const createDefaultLayout = (): SavedLayout => ({
  id: generateId(),
  name: "Default",
  updatedAt: Date.now(),
  items: [
    {
      i: generateId(),
      x: 0,
      y: 0,
      w: widgetCatalog.localClock.defaultSize.w,
      h: widgetCatalog.localClock.defaultSize.h,
      widgetKey: "localClock",
    },
    {
      i: generateId(),
      x: 4,
      y: 0,
      w: widgetCatalog.productionTimer.defaultSize.w,
      h: widgetCatalog.productionTimer.defaultSize.h,
      widgetKey: "productionTimer",
    },
    {
      i: generateId(),
      x: 7,
      y: 0,
      w: widgetCatalog.worldClock.defaultSize.w,
      h: widgetCatalog.worldClock.defaultSize.h,
      widgetKey: "worldClock",
    },
    {
      i: generateId(),
      x: 0,
      y: 4,
      w: widgetCatalog.primaryTimer.defaultSize.w,
      h: widgetCatalog.primaryTimer.defaultSize.h,
      widgetKey: "primaryTimer",
    },
    {
      i: generateId(),
      x: 4,
      y: 4,
      w: widgetCatalog.secondaryTimer.defaultSize.w,
      h: widgetCatalog.secondaryTimer.defaultSize.h,
      widgetKey: "secondaryTimer",
    },
    {
      i: generateId(),
      x: 7,
      y: 4,
      w: widgetCatalog.loopState.defaultSize.w,
      h: widgetCatalog.loopState.defaultSize.h,
      widgetKey: "loopState",
    },
  ],
});

function App() {
  const styles = useStyles();
  const initialLayouts = useMemo(() => {
    const stored = loadSavedLayouts();
    const hydrated = stored.length ? stored : [createDefaultLayout()];
    return normalizeLayoutSet(hydrated);
  }, []);

  const [state, setState] = useState({
    currentTime: 0,
    totalTime: 0,
    remainingTime: 0,
    loop: false,
    stopped: false,
    enableProductionClock: false,
    enableOntime: false,
    ontimeCurrent: 0,
    elapsedColor: "",
    remainingColor: "",
    clockColor: "",
    productionColor: "",
    startTime: 0,
    runtime: 0,
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
  const [currentTick, setCurrentTick] = useState(Date.now());
  const [layouts, setLayouts] = useState<SavedLayout[]>(initialLayouts);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(
    initialLayouts[0]?.id ?? ""
  );
  const [draftItems, setDraftItems] = useState<WidgetLayoutItem[]>(
    () => (initialLayouts[0]?.items ?? []).map((item) => ({ ...item }))
  );
  const layoutsRef = useRef<SavedLayout[]>(initialLayouts);
  const [configuringWidgetId, setConfiguringWidgetId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [showEditor, setShowEditor] = useState(false);
  const [gridWidth, setGridWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth - 32 : 1200
  );
  const [dockState, setDockState] = useState(() => {
    const baseWidth =
      typeof window !== "undefined"
        ? Math.max(240, Math.round(window.innerWidth * 0.2))
        : 260;
    return { x: 12, y: 12, width: baseWidth };
  });
  const dockDragRef = useRef<{ dx: number; dy: number } | null>(null);
  const dockResizeRef = useRef<{ startWidth: number; startX: number } | null>(null);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef<WidgetLayoutItem[] | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsValue, setSaveAsValue] = useState("");

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

  useEffect(() => {
    const displayResetListener = () => {
      setState({
        currentTime: 0,
        totalTime: 0,
        remainingTime: 0,
        loop: false,
        stopped: false,
        startTime: 0,
        runtime: 0,
        enableProductionClock: false,
        enableOntime: false,
        ontimeCurrent: 0,
        elapsedColor: "",
        remainingColor: "",
        clockColor: "",
        productionColor: "",
        timezoneClocks: [],
      });
    };

    const timersListener = (_event: unknown, arg: Partial<typeof state>) => {
      setState((prev) => ({
        ...prev,
        ...arg,
      }));
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

  const Status = {
    RUNNING: 0,
    HALFWAY: 1,
    ENDING: 2,
    ENDED: 3,
  };

  const status = () => {
    if (state.remainingTime <= 0) {
      return Status.ENDED;
    }

    if (state.remainingTime <= state.totalTime / 4) {
      return Status.ENDING;
    }

    if (state.remainingTime <= state.totalTime / 2) {
      return Status.HALFWAY;
    }

    return Status.RUNNING;
  };

  const remainingTimeColor = () => {
    switch (status()) {
      case Status.RUNNING:
        return state.remainingColor;
      case Status.HALFWAY:
        return "orange";
      case Status.ENDING:
        return "red";
      case Status.ENDED:
        return "red";
      default:
        return state.remainingColor;
    }
  };

  const handleToggleFullscreen = () => {
    window.api.send("window:toggle-fullscreen");
  };

  const selectedLayout = useMemo(
    () => layouts.find((layout) => layout.id === selectedLayoutId) ?? layouts[0],
    [layouts, selectedLayoutId]
  );

  useEffect(() => {
    if (selectedLayout) {
      setDraftItems(selectedLayout.items.map((item) => ({ ...item })));
    }
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
    if (mode !== "edit" || !showEditor) {
      setConfiguringWidgetId(null);
    }
  }, [mode, showEditor]);

  useEffect(() => {
    const handleResize = () => {
      if (gridContainerRef.current) {
        setGridWidth(gridContainerRef.current.clientWidth);
      } else {
        setGridWidth(window.innerWidth - 32);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (gridContainerRef.current) {
        setGridWidth(gridContainerRef.current.clientWidth);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [showEditor, mode]);

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
          width: Math.max(220, dockResizeRef.current!.startWidth + delta),
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
      const currentLayouts = layoutsRef.current;
      const target = currentLayouts.find(
        (layout) => layout.name.toLowerCase() === String(layoutName).toLowerCase()
      );
      if (!target) return;
      setSelectedLayoutId(target.id);
      setDraftItems(target.items.map((item) => ({ ...item })));
      setMode("preview");
      setShowEditor(false);
    };

    window.api.receive("layout:load", handleLayoutLoad);
    return () => {
      window.api.removeListener("layout:load", handleLayoutLoad);
    };
  }, []);

  // OSC Timer: tick update for running timers
  useEffect(() => {
    const hasRunningTimer = Object.values(oscTimers).some((t) => t.startedAt !== null);
    if (!hasRunningTimer) return;

    const interval = setInterval(() => setCurrentTick(Date.now()), 100);
    return () => clearInterval(interval);
  }, [oscTimers]);

  // OSC Timer: persist state
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("cgtimer.oscTimers", JSON.stringify(oscTimers));
  }, [oscTimers]);

  // OSC Timer: listen for commands
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

  const handleLayoutChange = (newLayout: Layout[]) => {
    if (!isEditing) return;
    setDraftItems((prev) =>
      newLayout.map((item) => {
        const existing = prev.find((p) => p.i === item.i);
        return {
          ...item,
          widgetKey: existing?.widgetKey ?? "worldClock",
          settings: existing?.settings,
        };
      })
    );
  };

  const handleDragStart = () => {
    if (!isEditing) return;
    dragOriginRef.current = draftItems.map((item) => ({ ...item }));
  };

  const handleDragStop = (layout: Layout[]) => {
    if (!isEditing) return;
    const normalizedLayout = layout.map((l) => {
      const existing = draftItems.find((p) => p.i === l.i);
      return {
        ...l,
        widgetKey: existing?.widgetKey ?? "worldClock",
        settings: existing?.settings,
      };
    });

    setDraftItems(normalizedLayout);
    dragOriginRef.current = null;
  };

  const handleDockDragStart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dockDragRef.current = {
      dx: event.clientX - dockState.x,
      dy: event.clientY - dockState.y,
    };
  };

  const handleDockResizeStart = (event: React.MouseEvent) => {
    dockResizeRef.current = {
      startWidth: dockState.width,
      startX: event.clientX,
    };
    event.stopPropagation();
  };

  const handleAddWidget = (widgetKey: WidgetKind) => {
    const definition = widgetCatalog[widgetKey];
    const defaultTimezoneId =
      state.timezoneClocks.find((tz) => tz.enabled)?.id ||
      state.timezoneClocks[0]?.id;

    const getDefaultSettings = (): WidgetLayoutItem["settings"] => {
      if (widgetKey === "worldClock") {
        return { timezoneId: defaultTimezoneId };
      }
      if (widgetKey === "oscTimer") {
        return { oscTimerName: `timer${generateId().slice(0, 4)}` };
      }
      return {};
    };

    const newItem: WidgetLayoutItem = {
      i: generateId(),
      x: 0,
      y: Infinity,
      w: definition.defaultSize.w,
      h: definition.defaultSize.h,
      minW: definition.minSize?.w,
      minH: definition.minSize?.h,
      widgetKey,
      settings: getDefaultSettings(),
    };
    setDraftItems((prev) => [...prev, newItem]);
  };

  const handleUpdateWidgetSettings = (
    id: string,
    updates: WidgetLayoutItem["settings"]
  ) => {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.i === id
          ? {
              ...item,
              settings: { ...item.settings, ...updates },
            }
          : item
      )
    );
  };

  const handleRemoveWidget = (id: string) => {
    if (configuringWidgetId === id) {
      setConfiguringWidgetId(null);
    }
    setDraftItems((prev) => prev.filter((item) => item.i !== id));
  };

  const handleSaveLayout = () => {
    if (!selectedLayout) {
      const fallback: SavedLayout = {
        id: generateId(),
        name: "Layout",
        updatedAt: Date.now(),
        items: draftItems,
      };
      setLayouts([fallback]);
      setSelectedLayoutId(fallback.id);
      setMode("preview");
      setShowEditor(false);
      return;
    }
    const updated = layouts.map((layout) =>
      layout.id === selectedLayout.id
        ? { ...layout, items: draftItems, updatedAt: Date.now() }
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
      items: draftItems,
    };
    setLayouts((prev) => [...prev, newLayout]);
    setSelectedLayoutId(newLayout.id);
    setSaveAsOpen(false);
    setMode("preview");
    setShowEditor(false);
  };

  const handleNewLayout = () => {
    const fresh = createDefaultLayout();
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
      items: draftItems.map((item) => ({ ...item, i: generateId() })),
    };
    setLayouts((prev) => [...prev, copy]);
    setSelectedLayoutId(copy.id);
  };

  const handleRenameLayout = () => {
    if (!selectedLayoutId) return;
    const current = layoutsRef.current.find((layout) => layout.id === selectedLayoutId);
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

  const handleRenameCancel = () => {
    setRenameTargetId(null);
  };

  const handleDeleteLayout = () => {
    if (!selectedLayout) return;
    const filtered = layouts.filter((layout) => layout.id !== selectedLayout.id);
    const nextLayouts = filtered.length ? filtered : [createDefaultLayout()];
    setLayouts(nextLayouts);
    setSelectedLayoutId(nextLayouts[0]?.id ?? "");
  };

  const renderWidget = (item: WidgetLayoutItem, isEditing: boolean) => {
    const widget = widgetCatalog[item.widgetKey];
    const colors = getWidgetColors(item.settings);
    const showLabel = item.settings?.showLabel !== false;
    const customLabel = item.settings?.customLabel;
    if (!widget) {
      return <div>Unknown widget</div>;
    }

    if (widget.key === "worldClock") {
      const timezones = state.timezoneClocks;
      const selectedTimezone =
        timezones.find((tz) => tz.id === item.settings?.timezoneId) ||
        timezones[0];
      const defaultLabel = selectedTimezone
        ? `${selectedTimezone.label} (${getTimezoneOffset(selectedTimezone.timezone)})`
        : "Configure a timezone";
      const time = selectedTimezone
        ? getTimezoneTime(selectedTimezone.timezone)
        : clockTime();

      const monitorStyle = colors.backgroundColor
        ? { backgroundColor: colors.backgroundColor }
        : undefined;

      return (
        <div className="monitor" style={monitorStyle}>
          {isEditing && (
            <div className={styles.widgetControl}>
              <Dropdown
                size="small"
                value={selectedTimezone?.label ?? "Local time"}
                selectedOptions={[selectedTimezone?.id ?? ""]}
                onOptionSelect={(_e, data) =>
                  handleUpdateWidgetSettings(item.i, {
                    timezoneId: data.optionValue || undefined,
                  })
                }
              >
                <Option value="">Local time</Option>
                {timezones.map((tz) => (
                  <Option key={tz.id} value={tz.id} text={tz.label}>
                    {tz.label}
                  </Option>
                ))}
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
            {timezones.length ? time : "Add a timezone in Preferences"}
          </div>
        </div>
      );
    }

    if (widget.key === "localClock") {
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
            {clockTime()}
          </div>
        </div>
      );
    }

    if (widget.key === "productionTimer") {
      return (
        <TimerMonitor
          title={customLabel || "Production"}
          value={
            state.enableProductionClock
              ? state.enableOntime
                ? Utils.msToTime(state.ontimeCurrent)
                : state.runtime
              : "--:--:--"
          }
          color={colors.faceColor ?? state.productionColor}
          labelColor={colors.labelColor}
          backgroundColor={colors.backgroundColor}
          className="small"
          showLabel={showLabel}
        />
      );
    }

    if (widget.key === "loopState") {
      const loopColor = state.loop ? "lime" : "#888";
      const loopAriaLabel = state.loop ? "Loop enabled" : "Loop disabled";
      return (
        <div
          className="monitor small"
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
              <ArrowRepeatAllRegular fontSize={56} />
            ) : (
              <ProhibitedRegular fontSize={56} />
            )}
          </div>
        </div>
      );
    }

    if (widget.key === "primaryTimer") {
      return (
        <TimerMonitor
          title={customLabel || "Remaining"}
          value={toTime(state.remainingTime)}
          color={colors.faceColor ?? remainingTimeColor()}
          labelColor={colors.labelColor}
          backgroundColor={colors.backgroundColor}
          className="clocks-stacked"
          showLabel={showLabel}
        />
      );
    }

    if (widget.key === "secondaryTimer") {
      return (
        <TimerMonitor
          title={customLabel || "Elapsed"}
          value={toTime(state.currentTime)}
          color={colors.faceColor ?? state.elapsedColor}
          labelColor={colors.labelColor}
          backgroundColor={colors.backgroundColor}
          className="clocks-stacked"
          showLabel={showLabel}
        />
      );
    }

    if (widget.key === "oscTimer") {
      const timerName = item.settings?.oscTimerName || "default";
      const timer = oscTimers[timerName] || { startedAt: null, elapsed: 0 };
      const displayTimeMs = timer.startedAt
        ? timer.elapsed + (currentTick - timer.startedAt)
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
                  handleUpdateWidgetSettings(item.i, {
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

    return null;
  };

  const isEditing = showEditor && mode === "edit";

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
        <Field label="Layout">
          <Dropdown
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
        onClick={handleDeleteLayout}
      >
        Delete layout
      </Button>

      <Caption1 className={styles.paletteHeading}>Add widget</Caption1>
      <div className={styles.dockButtonRowSingle}>
        {Object.values(widgetCatalog).map((widget) => (
          <Tooltip
            key={widget.key}
            content={widget.description}
            relationship="description"
            withArrow
          >
            <Button
              appearance="secondary"
              icon={<AddRegular />}
              onClick={() => handleAddWidget(widget.key)}
            >
              {widget.label}
            </Button>
          </Tooltip>
        ))}
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

      <div className={styles.layoutPanel}>
        {showEditor && renderDock()}

        <div
          className={mergeClasses(
            styles.gridArea,
            showEditor && styles.gridAreaEditing
          )}
          ref={gridContainerRef}
        >
          {gridWidth > 0 ? (
            <GridLayout
              key={selectedLayoutId}
              layout={draftItems}
              cols={GRID_COLS}
              rowHeight={60}
              width={gridWidth}
              margin={[12, 12]}
              containerPadding={[0, 0]}
              onLayoutChange={handleLayoutChange}
              onDragStart={showEditor ? handleDragStart : undefined}
              onDragStop={showEditor ? handleDragStop : undefined}
              draggableHandle={showEditor ? ".widget-card-handle" : undefined}
              isDraggable={isEditing}
              isResizable={isEditing}
              preventCollision
              compactType={null}
            >
              {draftItems.map((item) => {
                const widget = widgetCatalog[item.widgetKey];
                return (
                  <div
                    key={item.i}
                    className={mergeClasses(
                      styles.widgetCard,
                      !showEditor && styles.widgetCardDisplay
                    )}
                  >
                    {showEditor && (
                      <div
                        className={mergeClasses(
                          styles.widgetCardHeader,
                          "widget-card-handle"
                        )}
                      >
                        <div>
                          <Body1Strong className={styles.widgetCardTitle}>
                            {widget?.label ?? "Widget"}
                          </Body1Strong>
                          <Caption1 className={styles.widgetCardSubtitle} block>
                            {widget?.description}
                          </Caption1>
                        </div>
                        {isEditing && (
                          <div className={styles.widgetCardActions}>
                            <Popover
                              open={configuringWidgetId === item.i}
                              onOpenChange={(_e, data) =>
                                setConfiguringWidgetId(
                                  data.open ? item.i : null
                                )
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
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </PopoverTrigger>
                              <PopoverSurface>
                                <ColorConfigPanel
                                  item={item}
                                  onChange={(updates) =>
                                    handleUpdateWidgetSettings(item.i, updates)
                                  }
                                  onClose={() => setConfiguringWidgetId(null)}
                                />
                              </PopoverSurface>
                            </Popover>
                            <Button
                              appearance="subtle"
                              size="small"
                              icon={<DismissRegular />}
                              aria-label="Remove widget"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveWidget(item.i);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className={styles.widgetCardBody}>
                      {renderWidget(item, isEditing)}
                    </div>
                  </div>
                );
              })}
            </GridLayout>
          ) : null}
        </div>
      </div>

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
    </div>
  );
}

export default App;
