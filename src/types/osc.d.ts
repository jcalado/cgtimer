declare module "osc" {
  export type OSCValue = string | number | boolean | null | Uint8Array;

  export interface OSCMessage {
    address: string;
    args: Array<{ type?: string; value: OSCValue }>;
  }

  export interface UDPPortOptions {
    localAddress: string;
    localPort: number;
    remoteAddress?: string;
    remotePort?: number;
    metadata?: boolean;
  }

  export class UDPPort {
    constructor(options: UDPPortOptions);
    on(
      event: "message",
      listener: (oscMessage: OSCMessage, timetag?: unknown, info?: unknown) => void
    ): void;
    on(event: "ready", listener: () => void): void;
    on(event: "error", listener: (error: Error) => void): void;
    /** Sends to the configured remoteAddress/remotePort. */
    send(message: OSCMessage): void;
    open(): void;
    close(): void;
  }

  const osc: {
    UDPPort: typeof UDPPort;
  };

  export default osc;
}
