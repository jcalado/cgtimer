import React from "react";
import {
  Field,
  Input,
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

interface MixerSettingsProps {
  x32Host: string;
  x32Port: number;
  onX32HostChange: (value: string) => void;
  onX32PortChange: (value: number) => void;
}

export const MixerSettings: React.FC<MixerSettingsProps> = ({
  x32Host,
  x32Port,
  onX32HostChange,
  onX32PortChange,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.section}>
      <Field
        label="X32 / M32 address"
        hint="Console address for the X32 Channel and X32 Meter widgets. Leave empty to disable."
        className={styles.field}
      >
        <Input
          type="text"
          value={x32Host}
          placeholder="e.g. 192.168.1.50"
          onChange={(_, data) => onX32HostChange(data.value.trim())}
        />
      </Field>

      <Field
        label="OSC port"
        hint="X32/M32 remote port (default 10023; X-Air consoles use 10024)"
        className={styles.field}
      >
        <Input
          type="number"
          value={x32Port.toString()}
          onChange={(_, data) => {
            const value = parseInt(data.value, 10);
            if (!isNaN(value) && value >= 1 && value <= 65535) {
              onX32PortChange(value);
            }
          }}
        />
      </Field>
    </div>
  );
};
