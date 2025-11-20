import React, { useEffect, useState } from "react";
import {
  Field,
  Dropdown,
  Option,
  Switch,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXL,
  },
  field: {
    maxWidth: "400px",
  },
});

interface Display {
  id: number;
  label: string;
}

interface ApplicationSettingsProps {
  display: number;
  fullscreen: boolean;
  mainClock: "elapsed" | "remaining";
  onDisplayChange: (value: number) => void;
  onFullscreenChange: (value: boolean) => void;
  onMainClockChange: (value: "elapsed" | "remaining") => void;
}

export const ApplicationSettings: React.FC<ApplicationSettingsProps> = ({
  display,
  fullscreen,
  mainClock,
  onDisplayChange,
  onFullscreenChange,
  onMainClockChange,
}) => {
  const styles = useStyles();
  const [displays, setDisplays] = useState<Display[]>([]);

  useEffect(() => {
    // Get displays from main process
    window.electronAPI.getDisplays().then((displays) => {
      setDisplays(displays);
    });
  }, []);

  return (
    <div className={styles.section}>
      <Field
        label="Display"
        hint="Select which display to show the timer on"
        className={styles.field}
      >
        <Dropdown
          value={displays.find((d) => d.id === display)?.label || "Display 1"}
          selectedOptions={[display.toString()]}
          onOptionSelect={(_, data) => {
            const value = parseInt(data.optionValue || "0", 10);
            onDisplayChange(value);
          }}
        >
          {displays.map((d) => (
            <Option key={d.id} value={d.id.toString()}>
              {d.label}
            </Option>
          ))}
        </Dropdown>
      </Field>

      <Field
        label="Fullscreen"
        hint="Start the application in fullscreen mode"
        className={styles.field}
      >
        <Switch
          checked={fullscreen}
          onChange={(_, data) => onFullscreenChange(data.checked)}
        />
      </Field>

      <Field
        label="Main Clock"
        hint="Select which clock should be displayed larger (2x size)"
        className={styles.field}
      >
        <Dropdown
          value={mainClock === "elapsed" ? "Elapsed" : "Remaining"}
          selectedOptions={[mainClock]}
          onOptionSelect={(_, data) => {
            const value = data.optionValue as "elapsed" | "remaining";
            onMainClockChange(value);
          }}
        >
          <Option key="elapsed" value="elapsed">
            Elapsed
          </Option>
          <Option key="remaining" value="remaining">
            Remaining
          </Option>
        </Dropdown>
      </Field>
    </div>
  );
};
