import {
  ArrowRepeatAllRegular,
  BracesVariableRegular,
  CalendarClockRegular,
  ClockRegular,
  DataBarHorizontalRegular,
  DataBarVerticalRegular,
  FilmstripRegular,
  FlagRegular,
  GlobeRegular,
  HistoryRegular,
  HourglassRegular,
  MicRegular,
  NextRegular,
  PauseCircleRegular,
  PlayCircleRegular,
  PlugConnectedRegular,
  PulseRegular,
  RecordRegular,
  RectangleLandscapeRegular,
  ServerRegular,
  StackRegular,
  StorageRegular,
  TextFontRegular,
} from "@fluentui/react-icons";
import {
  WidgetDefinition,
  WidgetGroup,
  WidgetKind,
} from "./layout-types";

export const WIDGET_GROUPS: { id: WidgetGroup; label: string }[] = [
  { id: "clocks", label: "Clocks" },
  { id: "playback", label: "Playback" },
  { id: "timers", label: "Timers" },
  { id: "ontime", label: "Ontime" },
  { id: "recorders", label: "Recorders" },
  { id: "audio", label: "Audio" },
  { id: "utility", label: "Utility" },
];

// setupHint and reading follow the copy rules in docs/widget-help-design.md:
// max 2 sentences each, plain text, no URLs, "{oscPort}" interpolated at
// render time, and every hint names the preferences tab it refers to.
export const widgetCatalog: Record<WidgetKind, WidgetDefinition> = {
  worldClock: {
    key: "worldClock",
    label: "World Clock",
    description: "Pick a configured timezone and pin it here",
    icon: <GlobeRegular />,
    color: "#3b82f6",
    group: "clocks",
    source: "timezones",
    prefsTab: "timezones",
    setupHint:
      "Add timezones in Preferences > Timezones, then pick one from the dropdown on the widget.",
    reading:
      "Always live; a frozen 00:00:00 means the saved timezone is invalid. The header offset is whole hours relative to this machine.",
  },
  localClock: {
    key: "localClock",
    label: "Local Clock",
    description: "Shows the local system time",
    icon: <ClockRegular />,
    color: "#14b8a6",
    group: "clocks",
    source: "none",
    setupHint: "Works out of the box; follows the OS clock and timezone.",
    reading:
      "Shows the OS clock. An unsynced system clock shows the wrong time with no indication.",
  },
  primaryTimer: {
    key: "primaryTimer",
    label: "Remaining Timer",
    description: "Shows remaining time",
    icon: <HourglassRegular />,
    color: "#f59e0b",
    group: "playback",
    source: "ccgOsc",
    prefsTab: "server",
    setupHint:
      "Needs the CasparCG OSC feed on port {oscPort}: set the Server address in Preferences > Server (2.4+), or add a predefined OSC client in casparcg.config (2.3).",
    reading:
      "Orange from halfway, red in the last quarter. Freezes at the last value if the feed stops; pair with Now Playing to see feed liveness.",
  },
  secondaryTimer: {
    key: "secondaryTimer",
    label: "Elapsed Timer",
    description: "Shows elapsed time",
    icon: <HistoryRegular />,
    color: "#22c55e",
    group: "playback",
    source: "ccgOsc",
    prefsTab: "server",
    setupHint:
      "Needs the CasparCG OSC feed on port {oscPort}: set the Server address in Preferences > Server (2.4+), or add a predefined OSC client in casparcg.config (2.3).",
    reading:
      "Freezes at the last value if the feed stops; a stopped clip and a dead feed look identical.",
  },
  loopState: {
    key: "loopState",
    label: "Loop State",
    description: "Quick indicator for loop mode",
    icon: <ArrowRepeatAllRegular />,
    color: "#a855f7",
    group: "playback",
    source: "ccgOsc",
    prefsTab: "server",
    setupHint:
      "Needs the CasparCG OSC feed on port {oscPort}; configure it in Preferences > Server.",
    reading:
      "The grey crossed icon means loop off or no data from CasparCG; the two look identical.",
  },
  ccgClipName: {
    key: "ccgClipName",
    label: "Now Playing",
    description: "Filename of the clip playing on the CasparCG layer",
    icon: <FilmstripRegular />,
    color: "#06b6d4",
    group: "playback",
    source: "ccgOsc",
    prefsTab: "server",
    hasBuiltInStatus: true,
    setupHint:
      "Needs the CasparCG OSC feed on port {oscPort}; configure it in Preferences > Server.",
    reading:
      "The grey dash appears within 1.5 s of the feed going silent or the layer clearing, so this widget doubles as a feed-liveness canary.",
  },
  ccgPaused: {
    key: "ccgPaused",
    label: "Pause State",
    description: "Whether CasparCG playback is playing or paused",
    icon: <PauseCircleRegular />,
    color: "#f59e0b",
    group: "playback",
    source: "ccgOsc",
    prefsTab: "server",
    hasBuiltInStatus: true,
    setupHint:
      "Needs the CasparCG OSC feed on port {oscPort}; configure it in Preferences > Server.",
    reading:
      "No clip also means no OSC feed for 1.5 s; use Server Health to disambiguate.",
  },
  ccgNextClip: {
    key: "ccgNextClip",
    label: "Next Clip",
    description: "Clip cued in the CasparCG background (LOADBG)",
    icon: <NextRegular />,
    color: "#8b5cf6",
    group: "playback",
    source: "ccgOsc",
    prefsTab: "server",
    setupHint:
      "Needs the CasparCG OSC feed on port {oscPort}, and a playout workflow that cues with LOADBG; PLAY-only workflows always show NOT CUED.",
    reading:
      "NOT CUED right after a TAKE is normal. Blinks red when the playing clip has 10 s left with nothing cued behind it.",
  },
  ccgProgress: {
    key: "ccgProgress",
    label: "Clip Progress",
    description: "Progress bar for the playing CasparCG clip",
    icon: <DataBarHorizontalRegular />,
    color: "#22c55e",
    group: "playback",
    source: "ccgOsc",
    prefsTab: "server",
    setupHint:
      "Needs the CasparCG OSC feed on port {oscPort}; configure it in Preferences > Server.",
    reading:
      "Fill color follows the Remaining Timer thresholds. The bar freezes at its last position if the feed stops.",
  },
  ccgFormat: {
    key: "ccgFormat",
    label: "Channel Format",
    description: "Video mode and framerate of the CasparCG channel",
    icon: <RectangleLandscapeRegular />,
    color: "#64748b",
    group: "playback",
    source: "ccgOsc",
    prefsTab: "server",
    setupHint:
      "Needs the CasparCG OSC feed on port {oscPort}; the video-mode string needs CasparCG 2.4 or newer.",
    reading:
      "The value latches: it persists across disconnects and even a server restart until fresh packets arrive.",
  },
  ccgHealth: {
    key: "ccgHealth",
    label: "Server Health",
    description: "CasparCG AMCP connection, version and round-trip latency",
    icon: <ServerRegular />,
    color: "#22c55e",
    group: "playback",
    source: "ccgAmcp",
    prefsTab: "server",
    hasBuiltInStatus: true,
    setupHint:
      "Set the Server address and AMCP port (default 5250) in Preferences > Server; empty address disables the client.",
    reading:
      "Monitors the AMCP TCP link only; it can be green while OSC widgets are dashed, and vice versa. NO OSC PUSH means the server predates OSC SUBSCRIBE (2.4) and needs a manual casparcg.config OSC client.",
  },
  timeOfDayCountdown: {
    key: "timeOfDayCountdown",
    label: "Time-of-day Countdown",
    description: "Counts down to a target wall-clock time",
    icon: <CalendarClockRegular />,
    color: "#ef4444",
    group: "timers",
    source: "none",
    setupHint:
      "Type the target as zero-padded HH:MM:SS on the widget in edit mode; no external device needed.",
    reading:
      "Counts up with a + prefix and turns red after the target passes. The target is always today; it never rolls to tomorrow.",
  },
  oscTimer: {
    key: "oscTimer",
    label: "OSC Timer",
    description: "Stopwatch triggered via OSC commands",
    icon: <PulseRegular />,
    color: "#ec4899",
    group: "timers",
    source: "oscTimer",
    prefsTab: "server",
    setupHint:
      "Send /timer/{name}/start, /stop, /reset, /toggle or /set <ms> to UDP port {oscPort}; the widget's name must match the address exactly (case sensitive).",
    reading:
      "00:00:00 means never started, reset, or a name mismatch; a wrong port looks identical to a stopped timer. Running timers persist across app restarts.",
  },
  ontimeTimer: {
    key: "ontimeTimer",
    label: "Ontime Timer",
    description: "Mirrors the current timer from Ontime over OSC",
    icon: <PlugConnectedRegular />,
    color: "#10b981",
    group: "ontime",
    source: "ontime",
    prefsTab: "server",
    setupHint:
      "In Ontime, enable OSC output to this machine on port {oscPort} and cycle /from-ontime/current with {{timer.current}} every second.",
    reading:
      "Negative overtime shows a minus and turns red. Freezes at the last value if Ontime stops sending.",
  },
  ontimeTitle: {
    key: "ontimeTitle",
    label: "Ontime Title",
    description: "Title of the currently running Ontime event",
    icon: <TextFontRegular />,
    color: "#0ea5e9",
    group: "ontime",
    source: "ontime",
    prefsTab: "server",
    setupHint:
      "In Ontime, enable OSC output to this machine on port {oscPort} and cycle /from-ontime/title with {{eventNow.title}} every second.",
    reading:
      "A dash means no title received or no current event; a stale title persists if Ontime stops sending.",
  },
  ontimePlayback: {
    key: "ontimePlayback",
    label: "Ontime Playback",
    description: "Ontime playback state (play, pause, stop, roll, armed)",
    icon: <PlayCircleRegular />,
    color: "#84cc16",
    group: "ontime",
    source: "ontime",
    prefsTab: "server",
    hasBuiltInStatus: true,
    setupHint:
      "In Ontime, enable OSC output to this machine on port {oscPort} and cycle /from-ontime/playback with {{playback}} every second.",
    reading:
      "The crossed circle with a dash label means no data, not stopped; stopped shows a Stop icon.",
  },
  ontimeOnAir: {
    key: "ontimeOnAir",
    label: "Ontime On-Air",
    description: "On-air indicator from Ontime",
    icon: <RecordRegular />,
    color: "#dc2626",
    group: "ontime",
    source: "ontime",
    prefsTab: "server",
    setupHint:
      "In Ontime, enable OSC output to this machine on port {oscPort} and cycle /from-ontime/onAir with {{onAir}} every second.",
    reading:
      "OFF also means no data at all, and an ON AIR display can outlive a crashed Ontime; there is no staleness check.",
  },
  ontimeExpectedFinish: {
    key: "ontimeExpectedFinish",
    label: "Ontime Expected Finish",
    description: "Wall-clock time the current Ontime event is expected to end",
    icon: <FlagRegular />,
    color: "#f97316",
    group: "ontime",
    source: "ontime",
    prefsTab: "server",
    setupHint:
      "In Ontime, enable OSC output to this machine on port {oscPort} and cycle /from-ontime/expectedFinish with {{timer.expectedEnd}} every second.",
    reading:
      "Dashes mean no running event or no data. Events ending after midnight can show times like 25:10:00.",
  },
  recorderStatus: {
    key: "recorderStatus",
    label: "HyperDeck Recorder",
    description: "Recording status of a Blackmagic HyperDeck",
    icon: <RecordRegular />,
    color: "#dc2626",
    group: "recorders",
    source: "hyperdeck",
    prefsTab: "recorders",
    hasBuiltInStatus: true,
    setupHint:
      "Add the deck in Preferences > Recorders (TCP port 9993), then pick it from the dropdown on the widget.",
    reading:
      "ST:ND:BY covers every non-record transport state including playback; OF:FL:NE means the TCP connection is down.",
  },
  recorderMedia: {
    key: "recorderMedia",
    label: "HyperDeck Media",
    description: "Remaining record capacity on a HyperDeck's active slot",
    icon: <StorageRegular />,
    color: "#0ea5e9",
    group: "recorders",
    source: "hyperdeck",
    prefsTab: "recorders",
    setupHint:
      "Add the deck in Preferences > Recorders (TCP port 9993) and make sure media is mounted in its active slot.",
    reading:
      "Shows the ACTIVE slot only; red and blinking under 5 minutes. Hover distinguishes offline, no media, and not-yet-polled.",
  },
  recorderAggregate: {
    key: "recorderAggregate",
    label: "All Recorders",
    description: "Rollup of recording state across every HyperDeck",
    icon: <StackRegular />,
    color: "#dc2626",
    group: "recorders",
    source: "hyperdeck",
    prefsTab: "recorders",
    setupHint:
      "Add decks in Preferences > Recorders; the widget always sums every enabled deck, with no per-widget picker.",
    reading:
      "Blinks red only when ALL enabled decks record. Offline decks stay in the total; watch the amber N OFFLINE overlay.",
  },
  x32Channel: {
    key: "x32Channel",
    label: "X32 Channel",
    description: "Mute state and name of an X32/M32 input channel",
    icon: <MicRegular />,
    color: "#f43f5e",
    group: "audio",
    source: "x32",
    prefsTab: "mixer",
    hasBuiltInStatus: true,
    setupHint:
      "Set the console address in Preferences > Mixer (UDP port 10023), then pick the channel from the dropdown on the widget.",
    reading:
      "ON means unmuted on the console, not on-air. OFFLINE appears after 5 s without a console reply.",
  },
  x32Meter: {
    key: "x32Meter",
    label: "X32 Meter",
    description: "Live input level meter for an X32/M32 channel",
    icon: <DataBarVerticalRegular />,
    color: "#10b981",
    group: "audio",
    source: "x32",
    prefsTab: "mixer",
    setupHint:
      "Set the console address in Preferences > Mixer (UDP port 10023), then pick the channel from the dropdown on the widget.",
    reading:
      "Pre-fader input level on a -60 to 0 dB scale, so signal shows even when muted (red MUTED badge). An empty bar can also mean the console is offline; hover to check.",
  },
  displayTile: {
    key: "displayTile",
    label: "Variable Tile",
    description:
      "Shows any value pushed to /display/{key} over OSC (e.g. a Bitfocus Companion variable)",
    icon: <BracesVariableRegular />,
    color: "#eab308",
    group: "utility",
    source: "display",
    prefsTab: "server",
    setupHint:
      "Send /display/{key} <value> to UDP port {oscPort} and set the widget's key to match (case sensitive; slashes allowed). Sending no arguments clears the tile.",
    reading:
      "A grey dash means no value: nothing sent, key mismatch, cleared by the sender, or the app restarted. Values never go stale on their own.",
  },
};
