/**
 * Curated list of common timezones with city labels and a sorted, GMT-offset-decorated
 * `COMMON_TIMEZONES` array suitable for dropdowns.
 */

export type TimezoneCity = { city: string; tz: string };

export const TIMEZONE_CITIES: TimezoneCity[] = [
  { city: "Pago Pago", tz: "Pacific/Pago_Pago" }, // UTC-11
  { city: "Honolulu", tz: "Pacific/Honolulu" }, // UTC-10
  { city: "Anchorage", tz: "America/Anchorage" }, // UTC-9
  { city: "Los Angeles", tz: "America/Los_Angeles" }, // UTC-8
  { city: "Denver", tz: "America/Denver" }, // UTC-7
  { city: "Mexico City", tz: "America/Mexico_City" }, // UTC-6
  { city: "Chicago", tz: "America/Chicago" }, // UTC-6
  { city: "New York", tz: "America/New_York" }, // UTC-5
  { city: "Halifax", tz: "America/Halifax" }, // UTC-4
  { city: "São Paulo", tz: "America/Sao_Paulo" }, // UTC-3
  { city: "Buenos Aires", tz: "America/Argentina/Buenos_Aires" }, // UTC-3
  { city: "Azores", tz: "Atlantic/Azores" }, // UTC-1
  { city: "London", tz: "Europe/London" }, // UTC+0
  { city: "Lisbon", tz: "Europe/Lisbon" }, // UTC+0
  { city: "Paris", tz: "Europe/Paris" }, // UTC+1
  { city: "Berlin", tz: "Europe/Berlin" }, // UTC+1
  { city: "Madrid", tz: "Europe/Madrid" }, // UTC+1
  { city: "Athens", tz: "Europe/Athens" }, // UTC+2
  { city: "Cairo", tz: "Africa/Cairo" }, // UTC+2
  { city: "Johannesburg", tz: "Africa/Johannesburg" }, // UTC+2
  { city: "Moscow", tz: "Europe/Moscow" }, // UTC+3
  { city: "Istanbul", tz: "Europe/Istanbul" }, // UTC+3
  { city: "Dubai", tz: "Asia/Dubai" }, // UTC+4
  { city: "Karachi", tz: "Asia/Karachi" }, // UTC+5
  { city: "Mumbai", tz: "Asia/Kolkata" }, // UTC+5:30
  { city: "Dhaka", tz: "Asia/Dhaka" }, // UTC+6
  { city: "Bangkok", tz: "Asia/Bangkok" }, // UTC+7
  { city: "Singapore", tz: "Asia/Singapore" }, // UTC+8
  { city: "Hong Kong", tz: "Asia/Hong_Kong" }, // UTC+8
  { city: "Shanghai", tz: "Asia/Shanghai" }, // UTC+8
  { city: "Tokyo", tz: "Asia/Tokyo" }, // UTC+9
  { city: "Seoul", tz: "Asia/Seoul" }, // UTC+9
  { city: "Sydney", tz: "Australia/Sydney" }, // UTC+10
  { city: "Auckland", tz: "Pacific/Auckland" }, // UTC+12
];

export function getGMTOffset(timezone: string): string {
  try {
    const now = new Date();
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const gmtDate = new Date(now.toLocaleString("en-US", { timeZone: "GMT" }));
    const offsetMinutes = (tzDate.getTime() - gmtDate.getTime()) / 60000;
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? "+" : "-";
    return `GMT${sign}${hours}${minutes > 0 ? ":" + minutes.toString().padStart(2, "0") : ""}`;
  } catch {
    return "GMT";
  }
}

export type TimezoneOption = { label: string; value: string };

const offsetSortKey = (label: string): number => {
  const match = label.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!match) return 0;
  const hours = parseInt(match[2]);
  const minutes = parseInt(match[3] || "0");
  const total = hours * 60 + minutes;
  return match[1] === "+" ? total : -total;
};

export const COMMON_TIMEZONES: TimezoneOption[] = TIMEZONE_CITIES.map(
  ({ city, tz }) => ({
    label: `${city} (${getGMTOffset(tz)})`,
    value: tz,
  })
).sort((a, b) => offsetSortKey(a.label) - offsetSortKey(b.label));
