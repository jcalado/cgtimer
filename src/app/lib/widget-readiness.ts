import { PrefsTab, SourceId, WidgetKind, WidgetSettings } from "./layout-types";

/**
 * Single home for every "is this widget's data source alive" predicate and
 * every reason/fix string the guided faces show. Widgets never invent their
 * own readiness copy, so wording cannot drift per widget.
 */

export type SourceTelemetry = { lastSeenAt: number; lastSender: string };

/** The slice of the renderer's timers:update state that readiness needs. */
export type ReadinessState = {
  /** Wall clock of the render tick, so predicates stay pure. */
  now: number;
  sources: {
    ccgOsc: SourceTelemetry;
    ontime: SourceTelemetry;
    oscTimer: SourceTelemetry;
    display: SourceTelemetry;
    oscPort: number;
  };
  casparcg: {
    enabled: boolean;
    connected: boolean;
    lastError: string | null;
    latencyMs: number | null;
    oscSubscribed: boolean | null;
  };
  x32: { enabled: boolean; connected: boolean };
  recorders: Array<{ id: string; connected: boolean; lastError: string | null }>;
  timezoneClocks: Array<{ id: string }>;
  displayValues: Record<string, string>;
  /** Names of OSC timers that have ever received a command. */
  oscTimerNames: string[];
};

export type Readiness =
  | { level: "ready" }
  | { level: "unconfigured"; reason: string; fixLabel: string; prefsTab: PrefsTab }
  | { level: "waiting"; reason: string; fixLabel: string; prefsTab: PrefsTab }
  | { level: "offline"; reason: string; prefsTab: PrefsTab }
  | { level: "brokenRef"; reason: string; fixLabel: string; prefsTab: PrefsTab };

export type IntegrationHelp = {
  label: string;
  prefsTab?: PrefsTab;
  /** Shared plumbing steps; "{oscPort}" interpolated at render time. */
  setup: string[];
};

export const integrationHelp: Record<SourceId, IntegrationHelp> = {
  none: { label: "Local", setup: [] },
  timezones: {
    label: "Timezones",
    prefsTab: "timezones",
    setup: [
      "Preferences > Timezones: add at least one timezone (label, IANA zone, enabled).",
    ],
  },
  ccgOsc: {
    label: "CasparCG OSC feed",
    prefsTab: "server",
    setup: [
      "Preferences > Server: confirm Port (CGTimer's UDP OSC listen port, default {oscPort}) and Channel.",
      "CasparCG 2.4+: set Server address in Preferences > Server; CGTimer subscribes to OSC automatically over AMCP.",
      "CasparCG 2.3 or older: add a predefined OSC client in casparcg.config pointing at this machine's IP, port {oscPort}, then restart the server.",
    ],
  },
  ccgAmcp: {
    label: "CasparCG AMCP",
    prefsTab: "server",
    setup: [
      "Preferences > Server: set Server address (empty disables the AMCP client) and AMCP port (default 5250).",
    ],
  },
  ontime: {
    label: "Ontime",
    prefsTab: "server",
    setup: [
      "Ontime > Integrations > OSC: enable OSC output targeting this machine's IP, port {oscPort}.",
      "Add a cycling integration (every second) sending the widget's /from-ontime/... address with the matching Ontime variable.",
    ],
  },
  oscTimer: {
    label: "Inbound OSC",
    prefsTab: "server",
    setup: [
      "Point any OSC sender at this machine's IP, UDP port {oscPort} (Preferences > Server > Port). No handshake needed.",
    ],
  },
  display: {
    label: "Inbound OSC",
    prefsTab: "server",
    setup: [
      "Point any OSC sender at this machine's IP, UDP port {oscPort} (Preferences > Server > Port). No handshake needed.",
    ],
  },
  hyperdeck: {
    label: "HyperDecks",
    prefsTab: "recorders",
    setup: [
      "Preferences > Recorders: add a deck (label, host, port 9993) and keep it enabled.",
    ],
  },
  x32: {
    label: "X32 / M32",
    prefsTab: "mixer",
    setup: [
      "Preferences > Mixer: set the console address (empty disables the client) and OSC port (default 10023; X-Air uses 10024).",
    ],
  },
};

/** UDP feeds count as offline after this much silence following real data. */
const STALE_MS = 3000;

export const interpolate = (text: string, state: ReadinessState): string =>
  text.replace(/\{oscPort\}/g, String(state.sources.oscPort || 6251));

/** "Last packet: never" / "Last packet: 3 s ago from 192.168.1.10". */
export const formatLastData = (
  telemetry: SourceTelemetry,
  now: number
): string => {
  if (!telemetry.lastSeenAt) return "Last packet: never";
  const seconds = Math.max(0, Math.round((now - telemetry.lastSeenAt) / 1000));
  const from = telemetry.lastSender ? ` from ${telemetry.lastSender}` : "";
  return `Last packet: ${seconds} s ago${from}`;
};

const READY: Readiness = { level: "ready" };

export function getSourceStatus(
  state: ReadinessState
): Record<SourceId, Readiness> {
  const { now, sources, casparcg, x32, recorders, timezoneClocks } = state;

  const udpFamily = (
    telemetry: SourceTelemetry,
    unconfiguredReason: string,
    prefsTab: PrefsTab
  ): Readiness => {
    if (!telemetry.lastSeenAt) {
      return {
        level: "unconfigured",
        reason: unconfiguredReason,
        fixLabel: "Open Server settings",
        prefsTab,
      };
    }
    if (now - telemetry.lastSeenAt > STALE_MS) {
      return {
        level: "offline",
        reason: `Feed stopped (${formatLastData(telemetry, now).toLowerCase()})`,
        prefsTab,
      };
    }
    return READY;
  };

  const ccgOsc: Readiness = (() => {
    if (!sources.ccgOsc.lastSeenAt) {
      if (casparcg.connected) {
        return {
          level: "waiting" as const,
          reason: "AMCP connected but no OSC packets are arriving",
          fixLabel: "Open Server settings",
          prefsTab: "server" as const,
        };
      }
      if (casparcg.enabled) {
        return {
          level: "waiting" as const,
          reason: "Waiting for the CasparCG server (AMCP not connected)",
          fixLabel: "Open Server settings",
          prefsTab: "server" as const,
        };
      }
      return {
        level: "unconfigured" as const,
        reason: "No packets from CasparCG yet",
        fixLabel: "Open Server settings",
        prefsTab: "server" as const,
      };
    }
    if (now - sources.ccgOsc.lastSeenAt > STALE_MS) {
      return {
        level: "offline" as const,
        reason: "CasparCG OSC feed stopped",
        prefsTab: "server" as const,
      };
    }
    return READY;
  })();

  const ccgAmcp: Readiness = !casparcg.enabled
    ? {
        level: "unconfigured",
        reason: "No CasparCG server address configured",
        fixLabel: "Open Server settings",
        prefsTab: "server",
      }
    : !casparcg.connected
    ? {
        level: "offline",
        reason: `AMCP connection down${casparcg.lastError ? ` (${casparcg.lastError})` : ""}`,
        prefsTab: "server",
      }
    : casparcg.latencyMs == null
    ? {
        level: "waiting",
        reason: "Connected, waiting for the first PING reply",
        fixLabel: "Open Server settings",
        prefsTab: "server",
      }
    : READY;

  return {
    none: READY,
    timezones:
      timezoneClocks.length === 0
        ? {
            level: "unconfigured",
            reason: "No timezones configured",
            fixLabel: "Open Timezone settings",
            prefsTab: "timezones",
          }
        : READY,
    ccgOsc,
    ccgAmcp,
    ontime: udpFamily(
      state.sources.ontime,
      "Nothing received from Ontime on port {oscPort}",
      "server"
    ),
    oscTimer: udpFamily(
      state.sources.oscTimer,
      "No /timer commands received on port {oscPort}",
      "server"
    ),
    display: udpFamily(
      state.sources.display,
      "No /display values received on port {oscPort}",
      "server"
    ),
    hyperdeck:
      recorders.length === 0
        ? {
            level: "unconfigured",
            reason: "No recorders configured",
            fixLabel: "Open Recorder settings",
            prefsTab: "recorders",
          }
        : READY,
    x32: !x32.enabled
      ? {
          level: "unconfigured",
          reason: "No mixer address configured",
          fixLabel: "Open Mixer settings",
          prefsTab: "mixer",
        }
      : !x32.connected
      ? {
          level: "offline",
          reason: "No reply from the console",
          prefsTab: "mixer",
        }
      : READY,
  };
}

const TARGET_TIME_RE = /^\d{2}:\d{2}:\d{2}$/;

export function getWidgetReadiness(
  widgetKey: WidgetKind,
  source: SourceId,
  settings: WidgetSettings | undefined,
  state: ReadinessState
): Readiness {
  // ccgHealth IS the status widget; its own faces are the honest state.
  if (widgetKey === "ccgHealth") return READY;

  // Per-widget broken references and invalid settings outrank source status:
  // a widget pointing at a deleted resource is broken even if the source is up.
  if (widgetKey === "worldClock") {
    // No timezoneId is the explicit "Local time" choice; it needs nothing.
    if (!settings?.timezoneId) return READY;
    if (!state.timezoneClocks.some((tz) => tz.id === settings.timezoneId)) {
      return {
        level: "brokenRef",
        reason: "Timezone no longer configured",
        fixLabel: "Open Timezone settings",
        prefsTab: "timezones",
      };
    }
  }

  if (
    (widgetKey === "recorderStatus" || widgetKey === "recorderMedia") &&
    settings?.recorderId &&
    state.recorders.length > 0 &&
    !state.recorders.some((r) => r.id === settings.recorderId)
  ) {
    return {
      level: "brokenRef",
      reason: "Recorder removed or disabled",
      fixLabel: "Open Recorder settings",
      prefsTab: "recorders",
    };
  }

  if (
    widgetKey === "timeOfDayCountdown" &&
    // Mirrors the render fallback: an unset target means the 20:00:00 default.
    !TARGET_TIME_RE.test(settings?.targetTime || "20:00:00")
  ) {
    // The fix is the widget's own input, so no deep-link button (empty label
    // suppresses it in GuidedFace).
    return {
      level: "brokenRef",
      reason: "Target must be zero-padded HH:MM:SS; edit it on the widget",
      fixLabel: "",
      prefsTab: "server",
    };
  }

  const sourceStatus = getSourceStatus(state)[source];
  if (sourceStatus.level !== "ready") return sourceStatus;

  // The family is alive but this specific widget's name/key has never matched.
  if (widgetKey === "oscTimer") {
    const name = settings?.oscTimerName || "default";
    if (!state.oscTimerNames.includes(name)) {
      return {
        level: "waiting",
        reason: `Listening for /timer/${name}/start on port {oscPort}. Packets are arriving but none match this name (case sensitive).`,
        fixLabel: "Open Server settings",
        prefsTab: "server",
      };
    }
  }

  if (widgetKey === "displayTile") {
    const key = settings?.displayKey || "value";
    if (!(key in state.displayValues)) {
      return {
        level: "waiting",
        reason: `No value for key "${key}" yet. Send /display/${key} <value> to port {oscPort} (case sensitive).`,
        fixLabel: "Open Server settings",
        prefsTab: "server",
      };
    }
  }

  return READY;
}

/** Telemetry backing a source, for the guided face's "last packet" line. */
export function sourceTelemetry(
  source: SourceId,
  state: ReadinessState
): SourceTelemetry | null {
  switch (source) {
    case "ccgOsc":
      return state.sources.ccgOsc;
    case "ontime":
      return state.sources.ontime;
    case "oscTimer":
      return state.sources.oscTimer;
    case "display":
      return state.sources.display;
    default:
      return null;
  }
}
