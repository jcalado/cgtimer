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

interface ServerSettingsProps {
  port: number;
  channel: number;
  onPortChange: (value: number) => void;
  onChannelChange: (value: number) => void;
}

export const ServerSettings: React.FC<ServerSettingsProps> = ({
  port,
  channel,
  onPortChange,
  onChannelChange,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.section}>
      <Field
        label="Port"
        hint="CasparCG OSC Port"
        className={styles.field}
      >
        <Input
          type="number"
          value={port.toString()}
          onChange={(_, data) => {
            const value = parseInt(data.value, 10);
            if (!isNaN(value) && value >= 1 && value <= 65535) {
              onPortChange(value);
            }
          }}
        />
      </Field>

      <Field
        label="Channel"
        hint="CasparCG channel"
        className={styles.field}
      >
        <Input
          type="number"
          value={channel.toString()}
          onChange={(_, data) => {
            const value = parseInt(data.value, 10);
            if (!isNaN(value) && value >= 1) {
              onChannelChange(value);
            }
          }}
        />
      </Field>
    </div>
  );
};
