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
import { TimezoneClock } from "../../shared/entities";
import { COMMON_TIMEZONES } from "../lib/timezone-cities";

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
