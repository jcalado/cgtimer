import React, { useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import {
  Ban,
  Maximize2,
  Minimize2,
  Palette,
  Plus,
  Repeat,
  Save,
  Trash2,
} from "lucide-react";
import { Utils } from "../utils";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

type WidgetKind =
  | "worldClock"
  | "localClock"
  | "primaryTimer"
  | "secondaryTimer"
  | "productionTimer"
  | "loopState";

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
  };
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
};

const TimerMonitor = ({
  title,
  value,
  color,
  labelColor,
  backgroundColor,
  className = "",
  faceClassName = "",
}: TimerMonitorProps) => {
  const containerClass = ["monitor", className].filter(Boolean).join(" ");
  const faceClass = ["clock-face", faceClassName].filter(Boolean).join(" ");
  return (
    <div
      className={containerClass}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <h1 style={labelColor ? { color: labelColor } : undefined}>{title}</h1>
      <div className={faceClass} style={{ color }}>{value}</div>
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
  const colors = getWidgetColors(item.settings);
  const handleChange =
    (key: "labelColor" | "faceColor" | "backgroundColor") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onChange({ [key]: value || undefined });
    };

  const handleReset = () => {
    onChange({
      labelColor: undefined,
      faceColor: undefined,
      backgroundColor: undefined,
    });
  };

  return (
    <div className="widget-config-overlay" role="dialog" aria-label="Widget color settings">
      <div className="widget-config">
        <div className="widget-config__header">
          <div>
            <div className="widget-config__title">Colors</div>
            <div className="widget-config__subtitle">Customize label, face, and background</div>
          </div>
          <button type="button" className="quiet" onClick={onClose} aria-label="Close color settings">
            x
          </button>
        </div>
        <div className="widget-config__body">
          <label className="widget-config__row">
            <span>Label</span>
            <input
              type="color"
              value={colors.labelColor ?? "#aaaaaa"}
              onChange={handleChange("labelColor")}
            />
          </label>
          <label className="widget-config__row">
            <span>Clock Face</span>
            <input
              type="color"
              value={colors.faceColor ?? "#e5e9ff"}
              onChange={handleChange("faceColor")}
            />
          </label>
          <label className="widget-config__row">
            <span>Background</span>
            <input
              type="color"
              value={colors.backgroundColor ?? "#242424"}
              onChange={handleChange("backgroundColor")}
            />
          </label>
        </div>
        <div className="widget-config__footer">
          <button type="button" onClick={handleReset}>
            Reset to defaults
          </button>
          <button type="button" className="primary" onClick={onClose}>
            Done
          </button>
        </div>
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
    description: "Shows the configured main clock (elapsed or remaining)",
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 3, h: 3 },
  },
  secondaryTimer: {
    key: "secondaryTimer",
    label: "Elapsed Timer",
    description: "Shows the opposite clock to the main clock",
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
    mainClock: "remaining" as "elapsed" | "remaining",
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layouts, setLayouts] = useState<SavedLayout[]>(initialLayouts);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(
    initialLayouts[0]?.id ?? ""
  );
  const [draftItems, setDraftItems] = useState<WidgetLayoutItem[]>(
    initialLayouts[0]?.items ?? []
  );
  const [configuringWidgetId, setConfiguringWidgetId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showEditor, setShowEditor] = useState(true);
  const [gridWidth, setGridWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth - 32 : 1200
  );
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef<WidgetLayoutItem[] | null>(null);

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
        mainClock: "remaining",
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
      setDraftItems(selectedLayout.items);
    }
  }, [selectedLayout]);

  useEffect(() => {
    if (!layouts.length) return;
    persistLayouts(layouts);
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

  const handleAddWidget = (widgetKey: WidgetKind) => {
    const definition = widgetCatalog[widgetKey];
    const defaultTimezoneId =
      state.timezoneClocks.find((tz) => tz.enabled)?.id ||
      state.timezoneClocks[0]?.id;
    const newItem: WidgetLayoutItem = {
      i: generateId(),
      x: 0,
      y: Infinity,
      w: definition.defaultSize.w,
      h: definition.defaultSize.h,
      minW: definition.minSize?.w,
      minH: definition.minSize?.h,
      widgetKey,
      settings:
        widgetKey === "worldClock"
          ? {
              timezoneId: defaultTimezoneId,
            }
          : {},
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
    const name = prompt("Name for new layout?");
    if (!name) return;
    const newLayout: SavedLayout = {
      id: generateId(),
      name,
      updatedAt: Date.now(),
      items: draftItems,
    };
    setLayouts((prev) => [...prev, newLayout]);
    setSelectedLayoutId(newLayout.id);
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
    if (!widget) {
      return <div>Unknown widget</div>;
    }

    if (widget.key === "worldClock") {
      const timezones = state.timezoneClocks;
      const selectedTimezone =
        timezones.find((tz) => tz.id === item.settings?.timezoneId) ||
        timezones[0];
      const label = selectedTimezone
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
            <div className="widget-control">
              <label htmlFor={`timezone-${item.i}`}>Timezone</label>
              <select
                id={`timezone-${item.i}`}
                value={selectedTimezone?.id ?? ""}
                onChange={(e) =>
                  handleUpdateWidgetSettings(item.i, {
                    timezoneId: e.target.value || undefined,
                  })
                }
              >
                <option value="">Local time</option>
                {timezones.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
            {label}
          </h1>
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
          <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>
            Local Clock
          </h1>
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
          title="Production"
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
        />
      );
    }

    if (widget.key === "loopState") {
      const loopColor = state.loop ? "lime" : "#888";
      const loopLabel = state.loop ? "Loop enabled" : "Loop disabled";
      return (
        <div
          className="monitor small"
          style={
            colors.backgroundColor ? { backgroundColor: colors.backgroundColor } : undefined
          }
        >
          <h1 style={colors.labelColor ? { color: colors.labelColor } : undefined}>Loop</h1>
          <div
            className="clock-face"
            style={{ color: colors.faceColor ?? loopColor }}
            aria-label={loopLabel}
            title={loopLabel}
          >
            {state.loop ? <Repeat size={56} strokeWidth={2.5} /> : <Ban size={56} />}
          </div>
        </div>
      );
    }

    if (widget.key === "primaryTimer") {
      return (
        <TimerMonitor
          title={state.mainClock === "elapsed" ? "Elapsed" : "Remaining"}
          value={
            state.mainClock === "elapsed"
              ? toTime(state.currentTime)
              : toTime(state.remainingTime)
          }
          color={
            colors.faceColor ??
            (state.mainClock === "elapsed" ? state.elapsedColor : remainingTimeColor())
          }
          labelColor={colors.labelColor}
          backgroundColor={colors.backgroundColor}
          className="clocks-stacked"
        />
      );
    }

    if (widget.key === "secondaryTimer") {
      return (
        <TimerMonitor
          title={state.mainClock === "elapsed" ? "Remaining" : "Elapsed"}
          value={
            state.mainClock === "elapsed"
              ? toTime(state.remainingTime)
              : toTime(state.currentTime)
          }
          color={
            colors.faceColor ??
            (state.mainClock === "elapsed" ? remainingTimeColor() : state.elapsedColor)
          }
          labelColor={colors.labelColor}
          backgroundColor={colors.backgroundColor}
          className="clocks-stacked"
        />
      );
    }

    return null;
  };

  const isEditing = showEditor && mode === "edit";

  return (
    <div
      className="app"
      style={{ position: "relative" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <button
          onClick={handleToggleFullscreen}
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
            e.currentTarget.style.transform = "scale(1)";
          }}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 size={24} color="white" />
          ) : (
            <Maximize2 size={24} color="white" />
          )}
        </button>
      )}

      <div className="layout-panel">
        {showEditor && (
          <>
            <div className="layout-header">
              <div className="layout-select">
                <label htmlFor="layout-selector">Layout</label>
                <select
                  id="layout-selector"
                  value={selectedLayout?.id ?? ""}
                  onChange={(e) => setSelectedLayoutId(e.target.value)}
                >
                  {layouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                </select>
                <span className="layout-meta">
                  Last saved:{" "}
                  {selectedLayout?.updatedAt
                    ? new Date(selectedLayout.updatedAt).toLocaleString()
                    : "--"}
                </span>
              </div>
              <div className="layout-actions">
                <button type="button" onClick={handleSaveLayout}>
                  <Save size={16} /> Save &amp; Display
                </button>
                <button type="button" onClick={handleSaveAs}>
                  <Plus size={16} /> Save as
                </button>
                <button type="button" onClick={handleDuplicateLayout}>
                  Duplicate
                </button>
                <button type="button" onClick={handleNewLayout}>
                  New
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLayout}
                  className="danger"
                  title="Delete selected layout"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMode((prev) => (prev === "edit" ? "preview" : "edit"))
                  }
                  className={mode === "preview" ? "muted" : ""}
                >
                  {mode === "edit" ? "Preview" : "Edit"}
                </button>
              </div>
            </div>

            <div className="widget-palette">
              {Object.values(widgetCatalog).map((widget) => (
                <button
                  key={widget.key}
                  type="button"
                  onClick={() => handleAddWidget(widget.key)}
                  title={widget.description}
                >
                  <Plus size={14} /> Add {widget.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div
          className={`grid-area ${showEditor ? "" : "grid-area--display"}`}
          ref={gridContainerRef}
        >
          {gridWidth > 0 ? (
            <GridLayout
              layout={draftItems}
              cols={12}
              rowHeight={60}
              width={gridWidth}
              margin={[12, 12]}
              containerPadding={[0, 0]}
              onLayoutChange={handleLayoutChange}
              onDragStart={showEditor ? handleDragStart : undefined}
              onDragStop={showEditor ? handleDragStop : undefined}
              draggableHandle={showEditor ? ".widget-card__header" : undefined}
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
                    className={`widget-card ${
                      showEditor ? "" : "widget-card--display"
                    }`}
                  >
                    {showEditor && (
                      <div className="widget-card__header">
                        <div>
                          <div className="widget-card__title">
                            {widget?.label ?? "Widget"}
                          </div>
                          <div className="widget-card__subtitle">
                            {widget?.description}
                          </div>
                        </div>
                        {isEditing && (
                          <div className="widget-card__header-actions">
                            <button
                              type="button"
                              className="quiet"
                              onClick={() => setConfiguringWidgetId(item.i)}
                              aria-label="Configure widget colors"
                            >
                              <Palette size={14} />
                            </button>
                            <button
                              type="button"
                              className="quiet"
                              onClick={() => handleRemoveWidget(item.i)}
                              aria-label="Remove widget"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="widget-card__body">
                      {configuringWidgetId === item.i && (
                        <ColorConfigPanel
                          item={item}
                          onChange={(updates) => handleUpdateWidgetSettings(item.i, updates)}
                          onClose={() => setConfiguringWidgetId(null)}
                        />
                      )}
                      {renderWidget(item, isEditing)}
                    </div>
                  </div>
                );
              })}
            </GridLayout>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;
