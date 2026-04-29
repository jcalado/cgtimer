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
      const isFromActiveChannel = new RegExp(`/channel/${channel}`).test(
        address
      );
      const isTimeMessage = new RegExp(`/foreground/file/time`).test(address);
      const isLoopMessage = new RegExp(`/foreground/loop`).test(address);

      if (!isFromActiveChannel) {
        return;
      }

      // Packet contains playing file time
      if (isTimeMessage) {
        this.stopped = false;
        this.currentTime = Math.round(Number(args[0]["value"]));
        this.totalTime = Math.round(Number(args[1]["value"]));
        this.remainingTime = this.totalTime - this.currentTime;
        if (this.remainingTime < 0) {
          this.remainingTime = 0;
        }
      }

      if (isLoopMessage) {
        this.loop = Boolean(args[0]["value"]);
      }
  }

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
