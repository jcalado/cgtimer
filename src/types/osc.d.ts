declare module "osc" {
  export type OSCValue = string | number | boolean | null;

  export interface OSCMessage {
    address: string;
    args: Array<{ type?: string; value: OSCValue }>;
  }

  export interface UDPPortOptions {
    localAddress: string;
    localPort: number;
    metadata?: boolean;
  }

  export class UDPPort {
    constructor(options: UDPPortOptions);
    on(
      event: "message",
      listener: (oscMessage: OSCMessage, timetag?: unknown, info?: unknown) => void
    ): void;
    open(): void;
    close(): void;
  }

  const osc: {
    UDPPort: typeof UDPPort;
  };

  export default osc;
}
