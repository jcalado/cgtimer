import osc, { OSCMessage, UDPPort } from "osc";
import store from "./store";

type TimerAction = "start" | "stop" | "reset" | "toggle" | "set";

class oscListener {
  port: number;
  currentTime: number;
  remainingTime: number;
  totalTime: number;
  ontimeCurrent: number;
  ontimeTitle: string;
  ontimePlayback: string;
  ontimeOnAir: boolean;
  ontimeExpectedFinish: number;
  loop: boolean;
  stopped: boolean;
  paused: boolean;
  clipName: string;
  foregroundProducer: string;
  backgroundProducer: string;
  backgroundClipName: string;
  channelFormat: string;
  channelFramerate: number;
  foregroundSeenAt: number;
  backgroundSeenAt: number;
  udpPort: UDPPort | undefined;
  onLayoutLoad?: (layoutName: string) => void;
  onTimerCommand?: (name: string, action: TimerAction, value?: number) => void;

  constructor(
    onLayoutLoad?: (layoutName: string) => void,
    onTimerCommand?: (name: string, action: TimerAction, value?: number) => void
  ) {
    this.currentTime = 0;
    this.remainingTime = 0;
    this.totalTime = 0;
    this.ontimeCurrent = 0;
    this.ontimeTitle = "";
    this.ontimePlayback = "";
    this.ontimeOnAir = false;
    this.ontimeExpectedFinish = 0;
    this.loop = false;
    this.stopped = false;
    this.paused = false;
    this.clipName = "";
    this.foregroundProducer = "";
    this.backgroundProducer = "";
    this.backgroundClipName = "";
    this.channelFormat = "";
    this.channelFramerate = 0;
    this.foregroundSeenAt = 0;
    this.backgroundSeenAt = 0;
    this.udpPort = undefined;
    this.onLayoutLoad = onLayoutLoad;
    this.onTimerCommand = onTimerCommand;

    this.start();

    // Listen for server port or channel changes
    store.onDidChange("server", this.restart);
  }

  public start = () => {
    this.udpPort = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: store.get("server").port,
      metadata: true,
    });

    

    this.udpPort.on("message", (message: OSCMessage) => {
      if (message["address"] === "/layout/load" || message["address"] === "/layout/select") {
        const [firstArg] = message["args"] || [];
        if (typeof firstArg?.value === "string" && this.onLayoutLoad) {
          this.onLayoutLoad(firstArg.value);
        }
        return;
      }

      // Handle timer commands: /timer/{name}/{action}
      if (message["address"].startsWith("/timer/")) {
        this.parseTimerCommand(message);
        return;
      }

      // If the message startes with /channel/ then it is a CCG message
      if (message["address"].startsWith("/channel/")) {
        this.parseCCGMessage(message);
      }

      if (message["address"].startsWith("/from-ontime/")) {
        this.parseOntimeMessage(message);
      }

    });

    this.udpPort.open();
  };

  private parseCCGMessage = (message: OSCMessage) => {
    const channel = store.get("server").channel;
    const address = message["address"];
    const args = message["args"];
    // Anchored so channel 1 does not also match /channel/10, /channel/11, …
    const isFromActiveChannel = new RegExp(`^/channel/${channel}/`).test(
      address
    );

    if (!isFromActiveChannel) {
      return;
    }

    // Packet contains playing file time
    if (address.endsWith("/foreground/file/time")) {
      this.stopped = false;
      this.foregroundSeenAt = Date.now();
      this.currentTime = Math.round(Number(args[0]["value"]));
      this.totalTime = Math.round(Number(args[1]["value"]));
      this.remainingTime = this.totalTime - this.currentTime;
      if (this.remainingTime < 0) {
        this.remainingTime = 0;
      }
      return;
    }

    if (address.endsWith("/foreground/loop")) {
      this.foregroundSeenAt = Date.now();
      this.loop = Boolean(args[0]["value"]);
      return;
    }

    if (address.endsWith("/foreground/paused")) {
      this.foregroundSeenAt = Date.now();
      this.paused = Boolean(args[0]["value"]);
      return;
    }

    if (address.endsWith("/foreground/file/name")) {
      this.foregroundSeenAt = Date.now();
      this.clipName = String(args[0]?.["value"] ?? "");
      return;
    }

    if (address.endsWith("/foreground/producer")) {
      this.foregroundSeenAt = Date.now();
      this.foregroundProducer = String(args[0]?.["value"] ?? "");
      if (this.foregroundProducer === "empty") {
        this.clipName = "";
        this.paused = false;
      }
      return;
    }

    if (address.endsWith("/background/producer")) {
      this.backgroundSeenAt = Date.now();
      this.backgroundProducer = String(args[0]?.["value"] ?? "");
      if (this.backgroundProducer === "empty") {
        this.backgroundClipName = "";
      }
      return;
    }

    if (address.endsWith("/background/file/name")) {
      this.backgroundSeenAt = Date.now();
      this.backgroundClipName = String(args[0]?.["value"] ?? "");
      return;
    }

    // Channel-level paths (no layer segment): /channel/{n}/format, /channel/{n}/framerate
    if (address === `/channel/${channel}/format`) {
      this.channelFormat = String(args[0]?.["value"] ?? "");
      return;
    }

    if (address === `/channel/${channel}/framerate`) {
      // Sent as a rational (numerator, denominator) on 2.3+; tolerate a single value too.
      const num = Number(args[0]?.["value"] ?? 0);
      const den = Number(args[1]?.["value"] ?? 1);
      this.channelFramerate = den > 0 ? num / den : num;
      return;
    }
  }

  /**
   * CasparCG emits per-frame state while a producer is loaded and simply goes
   * quiet when the layer is cleared, so "no packets recently" means "no clip".
   */
  private static readonly CCG_STALE_MS = 1500;

  public isForegroundActive = (): boolean => {
    return (
      Date.now() - this.foregroundSeenAt < oscListener.CCG_STALE_MS &&
      this.foregroundProducer !== "empty"
    );
  };

  public isBackgroundCued = (): boolean => {
    return (
      Date.now() - this.backgroundSeenAt < oscListener.CCG_STALE_MS &&
      this.backgroundProducer !== "" &&
      this.backgroundProducer !== "empty"
    );
  };

  private parseOntimeMessage = (message: OSCMessage) => {
    const args = message["args"];
    const address = message["address"];
    const raw = args?.[0]?.["value"];
    const isNullish = raw === "null" || raw == null;

    if (address.startsWith("/from-ontime/current")) {
      this.ontimeCurrent = isNullish ? 0 : Number(raw);
      return;
    }
    if (address.startsWith("/from-ontime/expectedFinish")) {
      this.ontimeExpectedFinish = isNullish ? 0 : Number(raw);
      return;
    }
    if (address.startsWith("/from-ontime/title")) {
      this.ontimeTitle = isNullish ? "" : String(raw);
      return;
    }
    if (address.startsWith("/from-ontime/playback")) {
      this.ontimePlayback = isNullish ? "" : String(raw);
      return;
    }
    if (address.startsWith("/from-ontime/onAir")) {
      // Ontime sends booleans as 0/1 or true/false depending on version
      this.ontimeOnAir = raw === true || raw === 1 || raw === "1" || raw === "true";
      return;
    }
  };

  private parseTimerCommand = (message: OSCMessage) => {
    if (!this.onTimerCommand) return;

    // Parse /timer/{name}/{action} format
    const parts = message["address"].split("/").filter(Boolean);
    // parts = ["timer", "{name}", "{action}"]
    if (parts.length < 3) return;

    const name = parts[1];
    const action = parts[2] as TimerAction;

    // Validate action
    const validActions: TimerAction[] = ["start", "stop", "reset", "toggle", "set"];
    if (!validActions.includes(action)) return;

    // Get value for "set" action
    let value: number | undefined;
    if (action === "set" && message["args"]?.length > 0) {
      const firstArg = message["args"][0];
      if (typeof firstArg?.value === "number") {
        value = firstArg.value;
      }
    }

    this.onTimerCommand(name, action, value);
  }

  public stop = () => {
    if (this.udpPort) {
      this.udpPort.close();
    }
  };

  /**
   * Resets the timer to its initial state.
   */
  private reset = () => {
    this.currentTime = 0;
    this.remainingTime = 0;
    this.loop = false;
    this.stopped = true;
    this.totalTime = 0;
    this.paused = false;
    this.clipName = "";
    this.foregroundProducer = "";
    this.backgroundProducer = "";
    this.backgroundClipName = "";
    this.channelFormat = "";
    this.channelFramerate = 0;
    this.foregroundSeenAt = 0;
    this.backgroundSeenAt = 0;
  };

  /**
   * Restarts the timer by stopping, resetting, and then starting it again.
   */
  public restart = () => {
    this.stop();
    this.reset();
    this.start();
  };
}

export default oscListener;
