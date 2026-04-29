/**
 * Shared entity shapes used by both the main and renderer processes.
 * Kept free of any electron / DOM imports so it can be consumed from either side.
 */

export interface HyperDeck {
  id: string;
  label: string;
  host: string;
  port: number;
  enabled: boolean;
}

export const DEFAULT_HYPERDECK_PORT = 9993;

export interface TimezoneClock {
  id: string;
  label: string;
  timezone: string;
  enabled: boolean;
}

/** Display info exchanged between main and renderer over IPC. */
export interface DisplayInfo {
  id: number;
  label: string;
}
