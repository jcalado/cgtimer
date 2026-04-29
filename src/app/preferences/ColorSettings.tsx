import React from "react";
import {
  Body1Strong,
  Caption1,
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
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalL,
    maxWidth: "480px",
  },
  rowText: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  control: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
  },
  swatch: {
    width: "40px",
    height: "28px",
    padding: 0,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: "pointer",
  },
  hex: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    minWidth: "72px",
    textAlign: "right",
  },
});

interface ColorSettingsProps {
  clock: string;
  elapsed: string;
  remaining: string;
  onClockChange: (value: string) => void;
  onElapsedChange: (value: string) => void;
  onRemainingChange: (value: string) => void;
}

type RowProps = {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
};

export const ColorSettings: React.FC<ColorSettingsProps> = ({
  clock,
  elapsed,
  remaining,
  onClockChange,
  onElapsedChange,
  onRemainingChange,
}) => {
  const styles = useStyles();

  const Row = ({ id, label, hint, value, onChange }: RowProps) => (
    <label className={styles.row} htmlFor={id}>
      <span className={styles.rowText}>
        <Body1Strong>{label}</Body1Strong>
        <Caption1 className={styles.hint}>{hint}</Caption1>
      </span>
      <span className={styles.control}>
        <input
          id={id}
          type="color"
          className={styles.swatch}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className={styles.hex}>{value.toUpperCase()}</span>
      </span>
    </label>
  );

  return (
    <div className={styles.section}>
      <Row
        id="clockColor"
        label="Clock color"
        hint="Color for the main clock display"
        value={clock}
        onChange={onClockChange}
      />
      <Row
        id="elapsedColor"
        label="Elapsed time color"
        hint="Color for elapsed time display"
        value={elapsed}
        onChange={onElapsedChange}
      />
      <Row
        id="remainingColor"
        label="Remaining time color"
        hint="Color for remaining time display"
        value={remaining}
        onChange={onRemainingChange}
      />
    </div>
  );
};
