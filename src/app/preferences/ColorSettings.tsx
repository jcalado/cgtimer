import React from "react";
import {
  Field,
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
  colorInput: {
    width: "100px",
    height: "40px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: "pointer",
  },
  colorInputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  colorValue: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
});

interface ColorSettingsProps {
  clock: string;
  production: string;
  elapsed: string;
  remaining: string;
  onClockChange: (value: string) => void;
  onProductionChange: (value: string) => void;
  onElapsedChange: (value: string) => void;
  onRemainingChange: (value: string) => void;
}

export const ColorSettings: React.FC<ColorSettingsProps> = ({
  clock,
  production,
  elapsed,
  remaining,
  onClockChange,
  onProductionChange,
  onElapsedChange,
  onRemainingChange,
}) => {
  const styles = useStyles();

  const ColorField = ({
    label,
    hint,
    value,
    onChange,
  }: {
    label: string;
    hint: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <Field label={label} hint={hint} className={styles.field}>
      <div className={styles.colorInputWrapper}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.colorInput}
        />
        <span className={styles.colorValue}>{value.toUpperCase()}</span>
      </div>
    </Field>
  );

  return (
    <div className={styles.section}>
      <ColorField
        label="Clock color"
        hint="Color for the main clock display"
        value={clock}
        onChange={onClockChange}
      />

      <ColorField
        label="Production color"
        hint="Color for the production clock display"
        value={production}
        onChange={onProductionChange}
      />

      <ColorField
        label="Elapsed time color"
        hint="Color for elapsed time display"
        value={elapsed}
        onChange={onElapsedChange}
      />

      <ColorField
        label="Remaining time color"
        hint="Color for remaining time display"
        value={remaining}
        onChange={onRemainingChange}
      />
    </div>
  );
};
