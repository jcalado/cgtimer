import type { ReactElement } from "react";

export type WidgetKind =
  | "worldClock"
  | "localClock"
  | "primaryTimer"
  | "secondaryTimer"
  | "timeOfDayCountdown"
  | "loopState"
  | "ccgClipName"
  | "ccgPaused"
  | "ccgNextClip"
  | "ccgProgress"
  | "ccgFormat"
  | "ccgHealth"
  | "oscTimer"
  | "ontimeTimer"
  | "ontimeTitle"
  | "ontimePlayback"
  | "ontimeOnAir"
  | "ontimeExpectedFinish"
  | "recorderStatus"
  | "recorderMedia"
  | "recorderAggregate"
  | "x32Channel"
  | "x32Meter"
  | "displayTile";

export type WidgetSettings = {
  timezoneId?: string;
  labelColor?: string;
  faceColor?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  customLabel?: string;
  oscTimerName?: string;
  targetTime?: string; // HH:MM:SS for timeOfDayCountdown
  recorderId?: string; // hyperdeck id for recorderStatus / recorderMedia
  x32Channel?: number; // 1-based console channel for x32Channel / x32Meter
  displayKey?: string; // key watched by displayTile (/display/{key})
};

export type WidgetGroup =
  | "clocks"
  | "playback"
  | "timers"
  | "ontime"
  | "recorders"
  | "audio"
  | "utility";

/** The data source a widget depends on, for readiness detection and help. */
export type SourceId =
  | "none" // local clock only
  | "timezones" // worldClock
  | "ccgOsc" // CasparCG OSC feed widgets
  | "ccgAmcp" // ccgHealth
  | "ontime" // Ontime OSC widgets
  | "oscTimer" // OSC-driven stopwatches
  | "display" // /display/{key} tiles
  | "hyperdeck" // recorder widgets
  | "x32"; // X32/M32 widgets

/** Deep-link targets accepted by the preferences:open IPC. */
export type PrefsTab =
  | "server"
  | "recorders"
  | "mixer"
  | "timezones"
  | "companion";

export type WidgetDefinition = {
  key: WidgetKind;
  label: string;
  description: string;
  icon: ReactElement;
  color: string;
  group: WidgetGroup;
  /** Which data source feeds this widget; drives the readiness UI. */
  source: SourceId;
  /** 1-2 sentences of setup guidance; "{oscPort}" is interpolated at render time. */
  setupHint: string;
  /** 1-2 sentences decoding the face states; appended to the hover title. */
  reading: string;
  /** Preferences tab the guided face deep-links to; omit only for source "none". */
  prefsTab?: PrefsTab;
  /**
   * The widget renders its own honest offline/empty state, so the readiness
   * layer should not add a second indicator on top of it in run mode.
   */
  hasBuiltInStatus?: boolean;
};

export type WidgetNode = {
  type: "widget";
  id: string;
  widgetKey: WidgetKind;
  settings?: WidgetSettings;
};

export type SplitNode = {
  type: "split";
  id: string;
  direction: "horizontal" | "vertical";
  sizes: number[];
  children: LayoutNode[];
};

export type LayoutNode = WidgetNode | SplitNode;

export type SavedLayout = {
  id: string;
  name: string;
  root: LayoutNode | null;
  updatedAt: number;
};

export type Edge = "left" | "right" | "top" | "bottom";
