export type WidgetKind =
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

export type WidgetSettings = {
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

export type WidgetGroup = "clocks" | "playback" | "timers" | "ontime" | "recorders";

export type WidgetDefinition = {
  key: WidgetKind;
  label: string;
  description: string;
  icon: React.ReactElement;
  color: string;
  group: WidgetGroup;
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
