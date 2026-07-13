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
  host: string;
  amcpPort: number;
  port: number;
  channel: number;
  onHostChange: (value: string) => void;
  onAmcpPortChange: (value: number) => void;
  onPortChange: (value: number) => void;
  onChannelChange: (value: number) => void;
}

export const ServerSettings: React.FC<ServerSettingsProps> = ({
  host,
  amcpPort,
  port,
  channel,
  onHostChange,
  onAmcpPortChange,
  onPortChange,
  onChannelChange,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.section}>
      <Field
        label="Server address"
        hint="CasparCG host for AMCP: powers the Server Health widget and asks the server (2.4+) to stream OSC here automatically. Leave empty to disable."
        className={styles.field}
      >
        <Input
          type="text"
          value={host}
          placeholder="e.g. 127.0.0.1"
          onChange={(_, data) => onHostChange(data.value.trim())}
        />
      </Field>

      <Field
        label="AMCP port"
        hint="CasparCG AMCP TCP port (default 5250)"
        className={styles.field}
      >
        <Input
          type="number"
          value={amcpPort.toString()}
          onChange={(_, data) => {
            const value = parseInt(data.value, 10);
            if (!isNaN(value) && value >= 1 && value <= 65535) {
              onAmcpPortChange(value);
            }
          }}
        />
      </Field>

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
