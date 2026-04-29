import { ReactNode } from "react";
import {
  Body1Strong,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Table,
  TableBody,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Add24Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXL,
  },
  toolbar: {
    display: "flex",
    justifyContent: "flex-end",
  },
  table: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  emptyState: {
    textAlign: "center",
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
  },
  dialogField: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalM,
  },
});

export const useSettingsListStyles = useStyles;

export type SettingsListProps<T> = {
  items: T[];
  columns: string[];
  renderRow: (item: T) => ReactNode;
  emptyTitle: string;
  emptyHint?: string;
  /** Add dialog state + content. */
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  dialogTitle: string;
  dialogContent: ReactNode;
  /** Confirm-button props for the add dialog. */
  canAdd: boolean;
  onAdd: () => void;
  addLabel?: string;
};

export function SettingsList<T>({
  items,
  columns,
  renderRow,
  emptyTitle,
  emptyHint,
  dialogOpen,
  onDialogOpenChange,
  dialogTitle,
  dialogContent,
  canAdd,
  onAdd,
  addLabel = "Add",
}: SettingsListProps<T>) {
  const styles = useStyles();
  return (
    <div className={styles.section}>
      <Dialog
        open={dialogOpen}
        onOpenChange={(_e, data) => onDialogOpenChange(data.open)}
      >
        <div className={styles.toolbar}>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="primary" icon={<Add24Regular />}>
              {addLabel}
            </Button>
          </DialogTrigger>
        </div>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogContent>{dialogContent}</DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={onAdd} disabled={!canAdd}>
                {addLabel}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <Body1Strong>{emptyTitle}</Body1Strong>
          {emptyHint && <div>{emptyHint}</div>}
        </div>
      ) : (
        <Table className={styles.table}>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHeaderCell key={c}>{c}</TableHeaderCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{items.map(renderRow)}</TableBody>
        </Table>
      )}
    </div>
  );
}
