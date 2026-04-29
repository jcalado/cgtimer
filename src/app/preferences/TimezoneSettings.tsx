import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Input,
  Label,
  Switch,
  makeStyles,
  tokens,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Dropdown,
  Option,
} from "@fluentui/react-components";
import { Add24Regular, Delete24Regular } from "@fluentui/react-icons";

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

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  table: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  addButton: {
    alignSelf: "flex-start",
  },
  dialogField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px",
  },
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
  emptyState: {
    textAlign: "center",
    padding: "32px",
    color: tokens.colorNeutralForeground3,
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
  { city: "Baker Island", tz: "Pacific/Midway" },           // GMT-11
  { city: "Honolulu", tz: "Pacific/Honolulu" },             // GMT-10
  { city: "Anchorage", tz: "America/Anchorage" },           // GMT-9
  { city: "Los Angeles", tz: "America/Los_Angeles" },       // GMT-8
  { city: "Denver", tz: "America/Denver" },                 // GMT-7
  { city: "Chicago", tz: "America/Chicago" },               // GMT-6
  { city: "New York", tz: "America/New_York" },             // GMT-5
  { city: "Santiago", tz: "America/Santiago" },             // GMT-4
  { city: "São Paulo", tz: "America/Sao_Paulo" },           // GMT-3
  { city: "Buenos Aires", tz: "America/Argentina/Buenos_Aires" }, // GMT-3
  { city: "Newfoundland", tz: "America/St_Johns" },         // GMT-2:30
  { city: "Azores", tz: "Atlantic/Azores" },                // GMT-1
  { city: "London", tz: "Europe/London" },                  // GMT+0
  { city: "Paris", tz: "Europe/Paris" },                    // GMT+1
  { city: "Berlin", tz: "Europe/Berlin" },                  // GMT+1
  { city: "Cairo", tz: "Africa/Cairo" },                    // GMT+2
  { city: "Athens", tz: "Europe/Athens" },                  // GMT+2
  { city: "Moscow", tz: "Europe/Moscow" },                  // GMT+3
  { city: "Istanbul", tz: "Europe/Istanbul" },              // GMT+3
  { city: "Tehran", tz: "Asia/Tehran" },                    // GMT+3:30
  { city: "Dubai", tz: "Asia/Dubai" },                      // GMT+4
  { city: "Kabul", tz: "Asia/Kabul" },                      // GMT+4:30
  { city: "Karachi", tz: "Asia/Karachi" },                  // GMT+5
  { city: "Mumbai", tz: "Asia/Kolkata" },                   // GMT+5:30
  { city: "Dhaka", tz: "Asia/Dhaka" },                      // GMT+6
  { city: "Bangkok", tz: "Asia/Bangkok" },                  // GMT+7
  { city: "Singapore", tz: "Asia/Singapore" },              // GMT+8
  { city: "Hong Kong", tz: "Asia/Hong_Kong" },              // GMT+8
  { city: "Tokyo", tz: "Asia/Tokyo" },                      // GMT+9
  { city: "Seoul", tz: "Asia/Seoul" },                      // GMT+9
  { city: "Sydney", tz: "Australia/Sydney" },               // GMT+10/+11
  { city: "Melbourne", tz: "Australia/Melbourne" },         // GMT+10/+11
  { city: "Noumea", tz: "Pacific/Noumea" },                 // GMT+11
  { city: "Auckland", tz: "Pacific/Auckland" },             // GMT+12/+13
  { city: "Fiji", tz: "Pacific/Fiji" },                     // GMT+12
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
  const styles = useStyles();
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
    if (dialogOpen) {
      // Update immediately when dialog opens or timezone changes
      setPreviewTime(getTimezoneTime(newTimezone));

      // Then update every second
      const interval = setInterval(() => {
        setPreviewTime(getTimezoneTime(newTimezone));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [dialogOpen, newTimezone]);

  return (
    <div className={styles.container}>
      <Dialog open={dialogOpen} onOpenChange={(_, data) => setDialogOpen(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <Button
            className={styles.addButton}
            appearance="primary"
            icon={<Add24Regular />}
          >
            Add Timezone Clock
          </Button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Add Timezone Clock</DialogTitle>
            <DialogContent>
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
                  value={COMMON_TIMEZONES.find(tz => tz.value === newTimezone)?.label || ""}
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
                <div className={styles.timePreview} style={{ color: clockColor }}>
                  {previewTime}
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={handleAdd}
                disabled={!newLabel.trim()}
              >
                Add Clock
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {clocks.length === 0 ? (
        <div className={styles.emptyState}>
          No timezone clocks configured. Click "Add Timezone Clock" to get started.
        </div>
      ) : (
        <Table className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Label</TableHeaderCell>
              <TableHeaderCell>Timezone</TableHeaderCell>
              <TableHeaderCell>Enabled</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clocks.map((clock) => (
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
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
