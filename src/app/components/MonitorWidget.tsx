import { CSSProperties, ReactNode } from "react";
import { makeStyles, tokens } from "@fluentui/react-components";

export type WidgetColors = {
  backgroundColor?: string;
  labelColor?: string;
  faceColor?: string;
};

export type MonitorWidgetProps = {
  /** Default label shown when no `customLabel` is set. */
  label: string;
  customLabel?: string;
  showLabel?: boolean;
  /** Content rendered inside the clock face (digits, icon, etc.). */
  display: ReactNode;
  /** Fallback face color used when `colors.faceColor` is not set. */
  defaultFaceColor?: string;
  colors: WidgetColors;
  /** Adds the `.ending` modifier (red blinking face). */
  ending?: boolean;
  /** Optional editing-mode control (dropdown, input). Wrapped with absolute positioning. */
  control?: ReactNode;
  /** Optional absolute-positioned overlay rendered above the clock face. */
  overlay?: ReactNode;
  /** Extra style overrides for the clock face. */
  faceStyle?: CSSProperties;
  faceAriaLabel?: string;
  faceTitle?: string;
};

const useStyles = makeStyles({
  control: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    columnGap: tokens.spacingHorizontalS,
    position: "absolute",
    top: tokens.spacingVerticalXS,
    right: tokens.spacingHorizontalXS,
    zIndex: 2,
  },
});

export function MonitorWidget({
  label,
  customLabel,
  showLabel = true,
  display,
  defaultFaceColor,
  colors,
  ending,
  control,
  overlay,
  faceStyle,
  faceAriaLabel,
  faceTitle,
}: MonitorWidgetProps) {
  const styles = useStyles();
  const containerStyle = colors.backgroundColor
    ? { backgroundColor: colors.backgroundColor }
    : undefined;
  const labelStyle = colors.labelColor ? { color: colors.labelColor } : undefined;
  const baseFaceStyle: CSSProperties = {
    color: colors.faceColor ?? defaultFaceColor,
    ...faceStyle,
  };

  return (
    <div className={`monitor${ending ? " ending" : ""}`} style={containerStyle}>
      {control && <div className={styles.control}>{control}</div>}
      {showLabel && <h1 style={labelStyle}>{customLabel || label}</h1>}
      {overlay}
      <div
        className="clock-face"
        style={baseFaceStyle}
        aria-label={faceAriaLabel}
        title={faceTitle}
      >
        {display}
      </div>
    </div>
  );
}
