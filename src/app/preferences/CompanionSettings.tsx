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

interface CompanionSettingsProps {
  host: string;
  port: number;
  variable: string;
  onHostChange: (value: string) => void;
  onPortChange: (value: number) => void;
  onVariableChange: (value: string) => void;
}

export const CompanionSettings: React.FC<CompanionSettingsProps> = ({
  host,
  port,
  variable,
  onHostChange,
  onPortChange,
  onVariableChange,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.section}>
      <Field
        label="Companion address"
        hint="Bitfocus Companion host. CGTimer announces the active layout there so button feedbacks can light the current one. Leave empty to disable."
        className={styles.field}
      >
        <Input
          type="text"
          value={host}
          placeholder="e.g. 192.168.1.20"
          onChange={(_, data) => onHostChange(data.value.trim())}
        />
      </Field>

      <Field
        label="OSC port"
        hint="Companion's inbound OSC port (default 12321)"
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
        label="Custom variable"
        hint="Companion custom variable set to the active layout name. Create it in Companion under Variables, then compare it in a button's Check-variable-value feedback."
        className={styles.field}
      >
        <Input
          type="text"
          value={variable}
          placeholder="cgtimer_layout"
          onChange={(_, data) => onVariableChange(data.value.trim())}
        />
      </Field>
    </div>
  );
};
