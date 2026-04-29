import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  field: { width: "100%" },
});

export type PromptDialogProps = {
  open: boolean;
  title: string;
  message?: string;
  value: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export const PromptDialog = ({
  open,
  title,
  message,
  value,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onChange,
  onSubmit,
  onCancel,
}: PromptDialogProps) => {
  const styles = useStyles();
  return (
    <Dialog
      open={open}
      onOpenChange={(_e, data) => {
        if (!data.open) onCancel();
      }}
    >
      <DialogSurface>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <DialogBody>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
              <Field label={message} className={styles.field}>
                <Input
                  autoFocus
                  value={value}
                  onChange={(_e, data) => onChange(data.value)}
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" type="button" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button appearance="primary" type="submit">
                {confirmLabel}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};
