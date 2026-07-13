import osc, { UDPPort } from "osc";

/**
 * Announces CGTimer state to a Bitfocus Companion instance over Companion's
 * inbound OSC API (default port 12321).
 *
 * On every layout activation (and on a keepalive interval, so a restarted
 * Companion converges without user action) this sends:
 *  - `/custom-variable/{variable}/value "<layout name>"` — Companion's
 *    documented path for setting a custom variable, which button feedbacks
 *    can compare against to light the active layout.
 *  - `/layout/active "<layout name>"` — a generic announcement for any
 *    non-Companion OSC consumer pointed at the same target.
 */

const KEEPALIVE_MS = 10000;

export class CompanionAnnouncer {
  readonly host: string;
  readonly port: number;
  readonly variable: string;
  private udp: UDPPort | null = null;
  private ready = false;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private activeLayout = "";

  constructor(opts: { host: string; port: number; variable: string }) {
    this.host = opts.host;
    this.port = opts.port;
    this.variable = opts.variable;
  }

  start() {
    if (this.udp) return;

    const udp = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: 0,
      remoteAddress: this.host,
      remotePort: this.port,
      metadata: true,
    });
    this.udp = udp;

    udp.on("ready", () => {
      this.ready = true;
      this.announce();
      this.keepaliveTimer = setInterval(() => this.announce(), KEEPALIVE_MS);
    });

    udp.on("error", (error: Error) => {
      // UDP send errors are transient; the keepalive retries anyway.
      console.warn(`[companion] error: ${error.message}`);
    });

    udp.open();
  }

  stop() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    if (this.udp) {
      this.udp.close();
      this.udp = null;
    }
    this.ready = false;
  }

  setActiveLayout(name: string) {
    this.activeLayout = name;
    this.announce();
  }

  private announce() {
    if (!this.ready || !this.udp || !this.activeLayout) return;
    const value = [{ type: "s", value: this.activeLayout }];
    try {
      this.udp.send({
        address: `/custom-variable/${this.variable}/value`,
        args: value,
      });
      this.udp.send({ address: "/layout/active", args: value });
    } catch (error) {
      console.warn(`[companion] send failed: ${String(error)}`);
    }
  }
}
