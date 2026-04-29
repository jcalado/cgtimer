import React, { useState } from "react";
import {
  Button,
  Input,
  Label,
  Switch,
  makeStyles,
  TableRow,
  TableCell,
  Dropdown,
  Option,
} from "@fluentui/react-components";
import { Delete24Regular } from "@fluentui/react-icons";
import {
  SettingsList,
  useSettingsListStyles,
} from "../components/SettingsList";

interface TimezoneClock {
  id: string;
  label: string;
  timezone: string;
  enabled: boolean;
}

interface TimezoneSettingsProps {
  clocks: TimezoneClock[];
  clockColor: string;
  onChange: (clocks: TimezoneClock[]) => void;
}

const useTimezoneStyles = makeStyles({
  timePreview: {
    fontFamily: "led",
    fontSize: "56px",
    lineHeight: 1,
    fontWeight: "bold",
    textAlign: "center",
    padding: "20px 16px",
    backgroundColor: "#242424",
    borderRadius: "8px",
  },
});

function getGMTOffset(timezone: string): string {
  try {
    const now = new Date();
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const gmtDate = new Date(now.toLocaleString('en-US', { timeZone: 'GMT' }));
    const offsetMinutes = (tzDate.getTime() - gmtDate.getTime()) / 60000;
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    return `GMT${sign}${hours}${minutes > 0 ? ':' + minutes.toString().padStart(2, '0') : ''}`;
  } catch {
    return 'GMT';
  }
}

const TIMEZONE_CITIES = [
  { city: "Pago Pago", tz: "Pacific/Pago_Pago" },                  // UTC-11
  { city: "Honolulu", tz: "Pacific/Honolulu" },                    // UTC-10
  { city: "Anchorage", tz: "America/Anchorage" },                  // UTC-9
  { city: "Los Angeles", tz: "America/Los_Angeles" },              // UTC-8
  { city: "Denver", tz: "America/Denver" },                        // UTC-7
  { city: "Mexico City", tz: "America/Mexico_City" },              // UTC-6
  { city: "Chicago", tz: "America/Chicago" },                      // UTC-6
  { city: "New York", tz: "America/New_York" },                    // UTC-5
  { city: "Halifax", tz: "America/Halifax" },                      // UTC-4
  { city: "São Paulo", tz: "America/Sao_Paulo" },                  // UTC-3
  { city: "Buenos Aires", tz: "America/Argentina/Buenos_Aires" },  // UTC-3
  { city: "Azores", tz: "Atlantic/Azores" },                       // UTC-1
  { city: "London", tz: "Europe/London" },                         // UTC+0
  { city: "Lisbon", tz: "Europe/Lisbon" },                         // UTC+0
  { city: "Paris", tz: "Europe/Paris" },                           // UTC+1
  { city: "Berlin", tz: "Europe/Berlin" },                         // UTC+1
  { city: "Madrid", tz: "Europe/Madrid" },                         // UTC+1
  { city: "Athens", tz: "Europe/Athens" },                         // UTC+2
  { city: "Cairo", tz: "Africa/Cairo" },                           // UTC+2
  { city: "Johannesburg", tz: "Africa/Johannesburg" },             // UTC+2
  { city: "Moscow", tz: "Europe/Moscow" },                         // UTC+3
  { city: "Istanbul", tz: "Europe/Istanbul" },                     // UTC+3
  { city: "Dubai", tz: "Asia/Dubai" },                             // UTC+4
  { city: "Karachi", tz: "Asia/Karachi" },                         // UTC+5
  { city: "Mumbai", tz: "Asia/Kolkata" },                          // UTC+5:30
  { city: "Dhaka", tz: "Asia/Dhaka" },                             // UTC+6
  { city: "Bangkok", tz: "Asia/Bangkok" },                         // UTC+7
  { city: "Singapore", tz: "Asia/Singapore" },                     // UTC+8
  { city: "Hong Kong", tz: "Asia/Hong_Kong" },                     // UTC+8
  { city: "Shanghai", tz: "Asia/Shanghai" },                       // UTC+8
  { city: "Tokyo", tz: "Asia/Tokyo" },                             // UTC+9
  { city: "Seoul", tz: "Asia/Seoul" },                             // UTC+9
  { city: "Sydney", tz: "Australia/Sydney" },                      // UTC+10
  { city: "Auckland", tz: "Pacific/Auckland" },                    // UTC+12
];

const COMMON_TIMEZONES = TIMEZONE_CITIES.map(({ city, tz }) => ({
  label: `${city} (${getGMTOffset(tz)})`,
  value: tz
})).sort((a, b) => {
  // Extract GMT offset for sorting
  const getOffset = (label: string) => {
    const match = label.match(/GMT([+-])(\d+)(?::(\d+))?/);
    if (!match) return 0;
    const hours = parseInt(match[2]);
    const minutes = parseInt(match[3] || '0');
    const total = hours * 60 + minutes;
    return match[1] === '+' ? total : -total;
  };
  return getOffset(a.label) - getOffset(b.label);
});

function getTimezoneTime(timezone: string): string {
  try {
    const date = new Date();
    const timeString = date.toLocaleString("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    // Extract just the time part (after the comma and space)
    const parts = timeString.split(", ");
    return parts.length > 1 ? parts[1] : timeString;
  } catch (error) {
    console.error("Error getting timezone time:", error);
    return "00:00:00";
  }
}

export const TimezoneSettings: React.FC<TimezoneSettingsProps> = ({
  clocks,
  clockColor,
  onChange,
}) => {
  const styles = useSettingsListStyles();
  const tzStyles = useTimezoneStyles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newTimezone, setNewTimezone] = useState(COMMON_TIMEZONES[0]?.value || "Europe/London");
  const [previewTime, setPreviewTime] = useState("");

  const handleAdd = () => {
    if (!newLabel.trim()) return;

    const newClock: TimezoneClock = {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      timezone: newTimezone,
      enabled: true,
    };

    onChange([...clocks, newClock]);
    setNewLabel("");
    setNewTimezone(COMMON_TIMEZONES[0].value);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    onChange(clocks.filter((clock) => clock.id !== id));
  };

  const handleToggle = (id: string, enabled: boolean) => {
    onChange(
      clocks.map((clock) =>
        clock.id === id ? { ...clock, enabled } : clock
      )
    );
  };

  const handleTimezoneChange = (timezone: string) => {
    setNewTimezone(timezone);
    setPreviewTime(getTimezoneTime(timezone));
  };

  React.useEffect(() => {
    if (!dialogOpen) return;
    setPreviewTime(getTimezoneTime(newTimezone));
    let interval: ReturnType<typeof setInterval> | undefined;
    const align = 1000 - (Date.now() % 1000);
    const timeout = setTimeout(() => {
      setPreviewTime(getTimezoneTime(newTimezone));
      interval = setInterval(() => {
        setPreviewTime(getTimezoneTime(newTimezone));
      }, 1000);
    }, align);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [dialogOpen, newTimezone]);

  return (
    <SettingsList
      items={clocks}
      columns={["Label", "Timezone", "Enabled", "Actions"]}
      emptyTitle="No timezones configured."
      emptyHint="Click Add to get started."
      dialogOpen={dialogOpen}
      onDialogOpenChange={setDialogOpen}
      dialogTitle="Add Timezone Clock"
      canAdd={!!newLabel.trim()}
      onAdd={handleAdd}
      dialogContent={
        <>
          <div className={styles.dialogField}>
            <Label htmlFor="clock-label">Clock Label</Label>
            <Input
              id="clock-label"
              value={newLabel}
              onChange={(_, data) => setNewLabel(data.value)}
              placeholder="e.g., New York, London"
            />
          </div>

          <div className={styles.dialogField}>
            <Label htmlFor="timezone">Timezone</Label>
            <Dropdown
              id="timezone"
              value={COMMON_TIMEZONES.find((tz) => tz.value === newTimezone)?.label || ""}
              onOptionSelect={(_, data) => handleTimezoneChange(data.optionValue as string)}
              style={{ width: "100%" }}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <Option key={tz.value} value={tz.value}>
                  {tz.label}
                </Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.dialogField}>
            <Label>Current Time in This Timezone</Label>
            <div className={tzStyles.timePreview} style={{ color: clockColor }}>
              {previewTime}
            </div>
          </div>
        </>
      }
      renderRow={(clock) => (
        <TableRow key={clock.id}>
          <TableCell>{clock.label}</TableCell>
          <TableCell>{clock.timezone}</TableCell>
          <TableCell>
            <Switch
              checked={clock.enabled}
              onChange={(_, data) => handleToggle(clock.id, data.checked)}
            />
          </TableCell>
          <TableCell>
            <Button
              appearance="subtle"
              icon={<Delete24Regular />}
              onClick={() => handleDelete(clock.id)}
            />
          </TableCell>
        </TableRow>
      )}
    />
  );
};
