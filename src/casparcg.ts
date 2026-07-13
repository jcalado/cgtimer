import * as net from "node:net";
import { EventEmitter } from "node:events";

/**
 * Minimal AMCP client for CasparCG Server (TCP/5250), used for health
 * monitoring and OSC bootstrap rather than playout control.
 *
 * Protocol notes (AMCP spec + server source):
 *  - Replies are `\r\n`-terminated lines: `202 {CMD} OK` carries no data,
 *    `201 {CMD} OK` is followed by exactly one data line, `200 {CMD} OK` by
 *    multiple data lines ending with an empty line, and `400 ERROR` echoes
 *    the offending command on the next line.
 *  - `PING [token...]` answers with a codeless `PONG [token...]` line; we
 *    send the wall-clock as the token to measure round-trip latency.
 *  - `OSC SUBSCRIBE {port}` (2.4+) streams OSC to this client's address for
 *    the lifetime of the TCP connection, so the server needs no
 *    casparcg.config changes. Pre-2.4 servers reject it with `400 ERROR`.
 */

export type AmcpSnapshot = {
  enabled: boolean;
  connected: boolean;
  lastError: string | null;
  version: string;
  latencyMs: number | null;
  /** null = not answered yet, false = server refused (pre-2.4). */
  oscSubscribed: boolean | null;
};

export const DISABLED_AMCP_SNAPSHOT: AmcpSnapshot = {
  enabled: false,
  connected: false,
  lastError: null,
  version: "",
  latencyMs: null,
  oscSubscribed: null,
};

const RECONNECT_DELAY_MS = 5000;
const PING_INTERVAL_MS = 3000;

export class AmcpClient extends EventEmitter {
  readonly host: string;
  readonly port: number;
  /** UDP port CGTimer listens on; passed to OSC SUBSCRIBE. */
  readonly oscPort: number;
  private socket: net.Socket | null = null;
  private buffer = "";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;
  /** Which command's data line(s) the next reply line belongs to. */
  private pendingDataFor: "version" | "error-echo" | null = null;

  connected = false;
  lastError: string | null = null;
  version = "";
  latencyMs: number | null = null;
  oscSubscribed: boolean | null = null;

  constructor(opts: { host: string; port: number; oscPort: number }) {
    super();
    this.host = opts.host;
    this.port = opts.port;
    this.oscPort = opts.oscPort;
  }

  start() {
    if (this.disposed) return;
    if (this.socket) return;

    const socket = new net.Socket();
    this.socket = socket;
    this.buffer = "";
    this.pendingDataFor = null;

    socket.setEncoding("utf8");

    console.log(`[amcp] connecting to ${this.host}:${this.port}`);

    socket.on("connect", () => {
      this.connected = true;
      this.lastError = null;
      this.emit("change");
      console.log(`[amcp] connected`);
      socket.write("VERSION\r\n");
      socket.write(`OSC SUBSCRIBE ${this.oscPort}\r\n`);
      this.sendPing();
      this.pingTimer = setInterval(() => this.sendPing(), PING_INTERVAL_MS);
    });

    socket.on("data", (data: string) => this.ingest(data));

    socket.on("error", (err: NodeJS.ErrnoException) => {
      this.lastError = err.code || err.message || String(err);
      console.warn(`[amcp] socket error: ${this.lastError}`);
      // The matching "close" will fire next; let it handle the cleanup.
    });

    socket.on("close", () => {
      const wasConnected = this.connected;
      this.connected = false;
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      this.version = "";
      this.latencyMs = null;
      this.oscSubscribed = null;
      this.socket = null;
      if (wasConnected) {
        console.log(`[amcp] disconnected`);
      }
      this.emit("change");
      if (!this.disposed) {
        this.scheduleReconnect();
      }
    });

    socket.connect(this.port, this.host);
  }

  stop() {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.emit("change");
  }

  snapshot(): AmcpSnapshot {
    return {
      enabled: true,
      connected: this.connected,
      lastError: this.lastError,
      version: this.version,
      latencyMs: this.latencyMs,
      oscSubscribed: this.oscSubscribed,
    };
  }

  private sendPing() {
    if (this.socket && this.connected) {
      this.socket.write(`PING ${Date.now()}\r\n`);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.start();
    }, RECONNECT_DELAY_MS);
  }

  private ingest(chunk: string) {
    this.buffer += chunk;
    while (true) {
      const nl = this.buffer.indexOf("\r\n");
      if (nl < 0) return;
      const line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 2);
      this.handleLine(line);
    }
  }

  private handleLine(line: string) {
    if (this.pendingDataFor === "version") {
      this.pendingDataFor = null;
      this.version = line.trim();
      this.emit("change");
      return;
    }

    if (this.pendingDataFor === "error-echo") {
      this.pendingDataFor = null;
      if (line.toUpperCase().includes("OSC SUBSCRIBE")) {
        this.oscSubscribed = false;
        this.emit("change");
      }
      return;
    }

    const pongMatch = /^PONG(?:\s+(\S+))?/i.exec(line);
    if (pongMatch) {
      const sentAt = Number(pongMatch[1]);
      if (Number.isFinite(sentAt)) {
        this.latencyMs = Math.max(0, Date.now() - sentAt);
        this.emit("change");
      }
      return;
    }

    const replyMatch = /^(\d{3})\s+(.*)$/.exec(line);
    if (!replyMatch) return;
    const code = parseInt(replyMatch[1], 10);
    const text = replyMatch[2].toUpperCase();

    if (code === 201 && text.startsWith("VERSION")) {
      this.pendingDataFor = "version";
      return;
    }

    if (text.includes("OSC SUBSCRIBE")) {
      this.oscSubscribed = code < 400;
      this.emit("change");
      return;
    }

    if (code === 400) {
      // `400 ERROR` echoes the failing command on the next line; that is how
      // a pre-2.4 server rejects OSC SUBSCRIBE.
      this.pendingDataFor = "error-echo";
    }
  }
}
