import React from "react";
import { makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXL,
  },
  tableContainer: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusLarge,
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  headerRow: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  headerCell: {
    textAlign: "left",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  row: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  rowHeader: {
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
    width: "60%",
  },
  valueCell: {
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
  },
  label: {
    margin: 0,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  hint: {
    marginTop: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  colorInputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  colorInput: {
    width: "100px",
    height: "40px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: "pointer",
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

  const ColorRow = ({
    id,
    label,
    hint,
    value,
    onChange,
  }: {
    id: string;
    label: string;
    hint: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <tr className={styles.row}>
      <th scope="row" className={styles.rowHeader}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <div className={styles.hint}>{hint}</div>
      </th>
      <td className={styles.valueCell}>
        <div className={styles.colorInputWrapper}>
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={styles.colorInput}
          />
          <span className={styles.colorValue}>{value.toUpperCase()}</span>
        </div>
      </td>
    </tr>
  );

  return (
    <div className={styles.section}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th scope="col" className={styles.headerCell}>
                Target
              </th>
              <th scope="col" className={styles.headerCell}>
                Color
              </th>
            </tr>
          </thead>
          <tbody>
            <ColorRow
              id="clockColor"
              label="Clock color"
              hint="Color for the main clock display"
              value={clock}
              onChange={onClockChange}
            />

            <ColorRow
              id="productionColor"
              label="Production color"
              hint="Color for the production clock display"
              value={production}
              onChange={onProductionChange}
            />

            <ColorRow
              id="elapsedColor"
              label="Elapsed time color"
              hint="Color for elapsed time display"
              value={elapsed}
              onChange={onElapsedChange}
            />

            <ColorRow
              id="remainingColor"
              label="Remaining time color"
              hint="Color for remaining time display"
              value={remaining}
              onChange={onRemainingChange}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};
