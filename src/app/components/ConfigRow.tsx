import { ReactNode } from "react";
import { Caption1, makeStyles, tokens } from "@fluentui/react-components";

export type ConfigRowProps = {
  label: ReactNode;
  children: ReactNode;
};

const useStyles = makeStyles({
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalM,
  },
});

export function ConfigRow({ label, children }: ConfigRowProps) {
  const styles = useStyles();
  return (
    <div className={styles.row}>
      <Caption1>{label}</Caption1>
      {children}
    </div>
  );
}
