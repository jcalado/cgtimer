import React, { useEffect, useState } from "react";
import {
  Field,
  Dropdown,
  Option,
  Switch,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { DisplayInfo } from "../../shared/entities";

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

interface ApplicationSettingsProps {
  display: number;
  fullscreen: boolean;
  onDisplayChange: (value: number) => void;
  onFullscreenChange: (value: boolean) => void;
}

export const ApplicationSettings: React.FC<ApplicationSettingsProps> = ({
  display,
  fullscreen,
  onDisplayChange,
  onFullscreenChange,
}) => {
  const styles = useStyles();
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);

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
    </div>
  );
};
