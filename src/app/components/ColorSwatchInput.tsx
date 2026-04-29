import { ChangeEvent } from "react";
import { makeStyles, shorthands, tokens } from "@fluentui/react-components";

export type ColorSwatchInputProps = {
  value?: string;
  /** Color shown in the swatch when `value` is empty. */
  defaultValue: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
};

const useStyles = makeStyles({
  swatch: {
    width: "36px",
    height: "28px",
    ...shorthands.padding("0"),
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: "pointer",
  },
});

export function ColorSwatchInput({
  value,
  defaultValue,
  onChange,
  disabled,
}: ColorSwatchInputProps) {
  const styles = useStyles();
  return (
    <input
      type="color"
      className={styles.swatch}
      value={value ?? defaultValue}
      disabled={disabled}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.value || undefined)
      }
    />
  );
}
