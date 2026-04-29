import React from "react";
import {
  Body1Strong,
  Caption1,
  Field,
  Input,
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
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalL,
    maxWidth: "400px",
  },
  toggleText: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
  },
  toggleHint: {
    color: tokens.colorNeutralForeground3,
  },
});

interface ProductionSettingsProps {
  enable: boolean;
  start: string;
  runtime: string;
  ontime: boolean;
  onEnableChange: (value: boolean) => void;
  onStartChange: (value: string) => void;
  onRuntimeChange: (value: string) => void;
  onOntimeChange: (value: boolean) => void;
}

export const ProductionSettings: React.FC<ProductionSettingsProps> = ({
  enable,
  start,
  runtime,
  ontime,
  onEnableChange,
  onStartChange,
  onRuntimeChange,
  onOntimeChange,
}) => {
  const styles = useStyles();

  const validateTimeFormat = (value: string): boolean => {
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    return timeRegex.test(value);
  };

  return (
    <div className={styles.section}>
      <label className={styles.toggleRow}>
        <span className={styles.toggleText}>
          <Body1Strong>Enable production clock</Body1Strong>
          <Caption1 className={styles.toggleHint}>
            Splits the clock into live and production clocks
          </Caption1>
        </span>
        <Switch
          checked={enable}
          onChange={(_, data) => onEnableChange(data.checked)}
        />
      </label>

      {(enable || ontime) && (
        <>
          <Field
            label="Start time"
            hint="Production start time (HH:MM:SS)"
            className={styles.field}
            validationState={validateTimeFormat(start) ? "none" : "error"}
            validationMessage={
              validateTimeFormat(start) ? "" : "Invalid time format (use HH:MM:SS)"
            }
          >
            <Input
              type="text"
              value={start}
              onChange={(_, data) => onStartChange(data.value)}
              placeholder="00:10:00"
            />
          </Field>

          <Field
            label="Runtime"
            hint="Approximate production runtime (HH:MM:SS)"
            className={styles.field}
            validationState={validateTimeFormat(runtime) ? "none" : "error"}
            validationMessage={
              validateTimeFormat(runtime) ? "" : "Invalid time format (use HH:MM:SS)"
            }
          >
            <Input
              type="text"
              value={runtime}
              onChange={(_, data) => onRuntimeChange(data.value)}
              placeholder="00:20:00"
            />
          </Field>
        </>
      )}

      <label className={styles.toggleRow}>
        <span className={styles.toggleText}>
          <Body1Strong>Use ontime</Body1Strong>
          <Caption1 className={styles.toggleHint}>
            Use ontime for production clock management
          </Caption1>
        </span>
        <Switch
          checked={ontime}
          onChange={(_, data) => onOntimeChange(data.checked)}
        />
      </label>
    </div>
  );
};
