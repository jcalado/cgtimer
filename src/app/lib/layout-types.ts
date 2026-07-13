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

export type WidgetDefinition = {
  key: WidgetKind;
  label: string;
  description: string;
  icon: ReactElement;
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
