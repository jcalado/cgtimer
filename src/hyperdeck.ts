import * as net from "node:net";
import { EventEmitter } from "node:events";

/**
 * Minimal client for the legacy Blackmagic HyperDeck text protocol on TCP/9993.
 *
 * Protocol notes (from the HyperDeck Manual / public reverse-engineered libs):
 *  - The deck greets connections with `500 connection info:` followed by header
 *    lines and a blank-line terminator. Replies and async events use the same
 *    `<code> <message>:` block shape; multi-line bodies finish at a blank line.
 *  - `notify: transport: true` enables async transport state pushes; `transport
 *    info` returns the current snapshot. Both arrive as a `508 transport info:`
 *    block whose `status` field is one of: idle, preview, play, record,
 *    forward, rewind, jog, shuttle, stopped, etc.
 */

export type HyperDeckStatus =
  | "idle"
  | "preview"
  | "play"
  | "record"
  | "forward"
  | "rewind"
  | "jog"
  | "shuttle"
  | "stopped"
  | "unknown";

export type HyperDeckSnapshot = {
  id: string;
  label: string;
  host: string;
  port: number;
  connected: boolean;
  lastError: string | null;
  status: HyperDeckStatus;
  recordingSince: number | null; // epoch ms when status entered "record"
  displayTimecode: string; // HH:MM:SS:FF as reported by the deck
  videoFormat: string;
  clipId: string;
};

const RECONNECT_DELAY_MS = 5000;
const POLL_INTERVAL_MS = 500;

const parseStatus = (raw: string | undefined): HyperDeckStatus => {
  switch ((raw || "").toLowerCase()) {
    case "idle":
    case "preview":
    case "play":
    case "record":
    case "forward":
    case "rewind":
    case "jog":
    case "shuttle":
    case "stopped":
      return raw!.toLowerCase() as HyperDeckStatus;
    default:
      return "unknown";
  }
};

export class HyperDeckClient extends EventEmitter {
  readonly id: string;
  readonly label: string;
  readonly host: string;
  readonly port: number;
  private socket: net.Socket | null = null;
  private buffer = "";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  status: HyperDeckStatus = "unknown";
  recordingSince: number | null = null;
  displayTimecode = "";
  videoFormat = "";
  clipId = "";
  connected = false;
  lastError: string | null = null;

  constructor(opts: { id: string; label: string; host: string; port: number }) {
    super();
    this.id = opts.id;
    this.label = opts.label;
    this.host = opts.host;
    this.port = opts.port;
  }

  start() {
    if (this.disposed) return;
    if (this.socket) return;

    const socket = new net.Socket();
    this.socket = socket;
    this.buffer = "";

    socket.setEncoding("utf8");

    console.log(
      `[hyperdeck:${this.label}] connecting to ${this.host}:${this.port}`
    );

    socket.on("connect", () => {
      this.connected = true;
      this.lastError = null;
      this.emit("change");
      console.log(`[hyperdeck:${this.label}] connected`);
      // Subscribe to async transport notifications and ask for the current state.
      socket.write("notify: transport: true\r\n");
      socket.write("transport info\r\n");
      // Some firmwares don't push transport changes reliably; poll as a fallback.
      this.pollTimer = setInterval(() => {
        if (this.socket && this.connected) {
          this.socket.write("transport info\r\n");
        }
      }, POLL_INTERVAL_MS);
    });

    socket.on("data", (data: string) => this.ingest(data));

    socket.on("error", (err: NodeJS.ErrnoException) => {
      this.lastError = err.code || err.message || String(err);
      console.warn(
        `[hyperdeck:${this.label}] socket error: ${this.lastError}`
      );
      // The matching "close" will fire next; let it handle the cleanup.
    });

    socket.on("close", () => {
      const wasConnected = this.connected;
      this.connected = false;
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      this.status = "unknown";
      this.recordingSince = null;
      this.displayTimecode = "";
      this.videoFormat = "";
      this.clipId = "";
      this.socket = null;
      if (wasConnected) {
        console.log(`[hyperdeck:${this.label}] disconnected`);
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
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.emit("change");
  }

  snapshot(): HyperDeckSnapshot {
    return {
      id: this.id,
      label: this.label,
      host: this.host,
      port: this.port,
      connected: this.connected,
      lastError: this.lastError,
      status: this.status,
      recordingSince: this.recordingSince,
      displayTimecode: this.displayTimecode,
      videoFormat: this.videoFormat,
      clipId: this.clipId,
    };
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
    // Replies and async events use \r\n line endings on most firmwares;
    // normalise to \n so the parser only has to think about one.
    this.buffer = this.buffer.replace(/\r\n/g, "\n");

    // Each protocol block is either a single line ("200 ok\n") or a header
    // ending in ":" followed by body lines and a blank-line terminator.
    while (true) {
      const nl = this.buffer.indexOf("\n");
      if (nl < 0) return;
      const firstLine = this.buffer.slice(0, nl);

      if (firstLine.endsWith(":")) {
        const blank = this.buffer.indexOf("\n\n");
        if (blank < 0) return; // wait for the rest of the body
        const block = this.buffer.slice(0, blank);
        this.buffer = this.buffer.slice(blank + 2);
        this.handleBlock(block);
      } else {
        this.buffer = this.buffer.slice(nl + 1);
        this.handleBlock(firstLine);
      }
    }
  }

  private handleBlock(block: string) {
    const lines = block.split("\n").filter((l) => l.length > 0);
    if (!lines.length) return;
    const head = lines[0];
    const codeMatch = /^(\d{3})\s+(.+?):?$/.exec(head);
    if (!codeMatch) return;
    const code = parseInt(codeMatch[1], 10);
    const headerText = codeMatch[2].trim().toLowerCase();
    const fields: Record<string, string> = {};
    for (let i = 1; i < lines.length; i++) {
      const idx = lines[i].indexOf(":");
      if (idx < 0) continue;
      fields[lines[i].slice(0, idx).trim().toLowerCase()] =
        lines[i].slice(idx + 1).trim();
    }

    // Sync reply to `transport info` returns code 208; async push uses 508.
    // Match on the header text so we handle both consistently.
    if (headerText === "transport info") {
      this.applyTransportInfo(fields);
    }
  }

  private applyTransportInfo(fields: Record<string, string>) {
    const previous = this.status;
    if ("status" in fields) this.status = parseStatus(fields["status"]);
    if ("display timecode" in fields)
      this.displayTimecode = fields["display timecode"];
    if ("video format" in fields) this.videoFormat = fields["video format"];
    if ("clip id" in fields) this.clipId = fields["clip id"];

    if (this.status === "record" && previous !== "record") {
      this.recordingSince = Date.now();
    } else if (this.status !== "record" && previous === "record") {
      this.recordingSince = null;
    }

    this.emit("change");
  }
}
