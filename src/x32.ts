import osc, { OSCMessage, UDPPort } from "osc";
import { EventEmitter } from "node:events";

/**
 * Client for the Behringer X32/M32 OSC remote protocol (UDP/10023).
 *
 * Protocol notes (Patrick-Gilles Maillot's unofficial protocol doc):
 *  - Sending a parameter address with no arguments queries it; the console
 *    echoes the address back with the current value.
 *  - `/xremote` (no args) subscribes this client to all parameter changes
 *    for 10 seconds and must be renewed to stay live.
 *  - `/meters ,s /meters/1` streams the METERS/channel page as OSC blobs
 *    (~50 ms cadence) for 10 seconds: 96 floats where indexes 0-31 are the
 *    32 input channel levels. Inside the blob: an int32 little-endian float
 *    count followed by little-endian float32 values.
 *  - `/ch/NN/mix/on` is {OFF, ON} as int 0/1 (1 = unmuted), `mix/fader` is a
 *    level float [0..1], `config/name` a string.
 *  - UDP is connectionless, so liveness is inferred from replies: anything
 *    received within the last few seconds counts as connected.
 */

export type X32ChannelState = {
  /** 1-based console channel number. */
  index: number;
  name: string;
  /** true = channel ON (unmuted). */
  on: boolean;
  /** Fader level [0..1]. */
  fader: number;
  /** Input meter level [0..1], linear. */
  meter: number;
};

export type X32Snapshot = {
  enabled: boolean;
  connected: boolean;
  channels: X32ChannelState[];
};

export const DISABLED_X32_SNAPSHOT: X32Snapshot = {
  enabled: false,
  connected: false,
  channels: [],
};

export const X32_CHANNEL_COUNT = 32;
const SUBSCRIPTION_RENEW_MS = 8000; // /xremote and /meters expire after 10 s
const OFFLINE_AFTER_MS = 5000;

const pad2 = (n: number) => n.toString().padStart(2, "0");

export class X32Client extends EventEmitter {
  readonly host: string;
  readonly port: number;
  private udp: UDPPort | null = null;
  private renewTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;
  private lastReplyAt = 0;

  channels: X32ChannelState[] = Array.from(
    { length: X32_CHANNEL_COUNT },
    (_, i) => ({ index: i + 1, name: "", on: true, fader: 0, meter: 0 })
  );

  constructor(opts: { host: string; port: number }) {
    super();
    this.host = opts.host;
    this.port = opts.port;
  }

  start() {
    if (this.disposed) return;
    if (this.udp) return;

    const udp = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: 0, // ephemeral; the console replies to our source port
      remoteAddress: this.host,
      remotePort: this.port,
      metadata: true,
    });
    this.udp = udp;

    console.log(`[x32] talking to ${this.host}:${this.port}`);

    udp.on("ready", () => {
      this.subscribe();
      this.queryChannelState();
      this.renewTimer = setInterval(() => this.subscribe(), SUBSCRIPTION_RENEW_MS);
    });

    udp.on("message", (message: OSCMessage) => this.handleMessage(message));

    udp.on("error", (error: Error) => {
      // UDP errors are transient (e.g. EHOSTUNREACH); staleness handles state.
      console.warn(`[x32] error: ${error.message}`);
    });

    udp.open();
  }

  stop() {
    this.disposed = true;
    if (this.renewTimer) {
      clearInterval(this.renewTimer);
      this.renewTimer = null;
    }
    if (this.udp) {
      this.udp.close();
      this.udp = null;
    }
    this.emit("change");
  }

  get connected(): boolean {
    return Date.now() - this.lastReplyAt < OFFLINE_AFTER_MS;
  }

  snapshot(): X32Snapshot {
    return {
      enabled: true,
      connected: this.connected,
      channels: this.channels.map((c) => ({ ...c })),
    };
  }

  private send(address: string, args: OSCMessage["args"] = []) {
    if (!this.udp) return;
    try {
      this.udp.send({ address, args });
    } catch (error) {
      console.warn(`[x32] send failed: ${String(error)}`);
    }
  }

  private subscribe() {
    this.send("/xremote");
    this.send("/meters", [{ type: "s", value: "/meters/1" }]);
  }

  /** Argument-less sends are queries; the console echoes current values. */
  private queryChannelState() {
    for (let i = 1; i <= X32_CHANNEL_COUNT; i++) {
      this.send(`/ch/${pad2(i)}/config/name`);
      this.send(`/ch/${pad2(i)}/mix/on`);
      this.send(`/ch/${pad2(i)}/mix/fader`);
    }
  }

  private handleMessage(message: OSCMessage) {
    this.lastReplyAt = Date.now();

    if (message.address === "/meters/1") {
      const blob = message.args?.[0]?.value;
      if (blob instanceof Uint8Array) {
        this.applyMeters(blob);
      }
      return;
    }

    const chMatch = /^\/ch\/(\d{2})\/(config\/name|mix\/on|mix\/fader)$/.exec(
      message.address
    );
    if (!chMatch) return;
    const idx = parseInt(chMatch[1], 10) - 1;
    if (idx < 0 || idx >= X32_CHANNEL_COUNT) return;
    const raw = message.args?.[0]?.value;
    const channel = this.channels[idx];

    switch (chMatch[2]) {
      case "config/name":
        channel.name = String(raw ?? "");
        break;
      case "mix/on":
        channel.on = Number(raw) === 1;
        break;
      case "mix/fader":
        channel.fader = Number(raw) || 0;
        break;
    }
    this.emit("change");
  }

  private applyMeters(blob: Uint8Array) {
    // Inside the OSC blob: int32 LE float count, then LE float32 values.
    if (blob.byteLength < 4) return;
    const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
    const count = view.getInt32(0, true);
    const available = Math.floor((blob.byteLength - 4) / 4);
    const usable = Math.min(count, available, X32_CHANNEL_COUNT);
    for (let i = 0; i < usable; i++) {
      this.channels[i].meter = view.getFloat32(4 + i * 4, true);
    }
  }
}
