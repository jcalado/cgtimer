/**
 * Time formatting helpers used by the renderer's clock/timer widgets.
 * All functions are pure and take primitives so they can be reused anywhere.
 */

/** Format a number of seconds as `HH:MM:SS`. */
export function toTime(seconds: number): string {
  return new Date(seconds * 1000).toISOString().substr(11, 8);
}

/** Format a number of seconds as `HH:MM:SS` without wrapping past 24 hours. */
export function toDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** Format a wall-clock epoch ms as the local `HH:MM:SS`. */
export function clockTime(now: number): string {
  const date = new Date(now);
  const timeZoneOffset = date.getTimezoneOffset() * 60 * 1000;
  const timeZoneDate = new Date(date.getTime() - timeZoneOffset);
  return timeZoneDate.toISOString().substr(11, 8);
}

/** Format a wall-clock epoch ms as `HH:MM:SS` in a given IANA timezone. */
export function getTimezoneTime(timezone: string, now: number): string {
  try {
    const timeString = new Date(now).toLocaleString("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = timeString.split(", ");
    return parts.length > 1 ? parts[1] : timeString;
  } catch {
    return "00:00:00";
  }
}

/** Compact `+Nh` / `-Nh` offset of a timezone vs. the local zone (no minutes). */
export function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const localDate = new Date();
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const offsetMinutes = (tzDate.getTime() - localDate.getTime()) / 60000;
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const sign = offsetMinutes >= 0 ? "+" : "-";
    return `${sign}${hours}h`;
  } catch {
    return "";
  }
}
