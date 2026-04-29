import React, { useState } from "react";
import {
  Body1Strong,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Add24Regular, Delete24Regular } from "@fluentui/react-icons";

interface HyperDeck {
  id: string;
  label: string;
  host: string;
  port: number;
  enabled: boolean;
}

interface RecordersSettingsProps {
  hyperdecks: HyperDeck[];
  onChange: (hyperdecks: HyperDeck[]) => void;
}

const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
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
    gap: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalM,
  },
});

const DEFAULT_PORT = 9993;

export const RecordersSettings: React.FC<RecordersSettingsProps> = ({
  hyperdecks,
  onChange,
}) => {
  const styles = useStyles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(String(DEFAULT_PORT));

  const reset = () => {
    setLabel("");
    setHost("");
    setPort(String(DEFAULT_PORT));
  };

  const handleAdd = () => {
    const trimmedLabel = label.trim();
    const trimmedHost = host.trim();
    const parsedPort = parseInt(port, 10) || DEFAULT_PORT;
    if (!trimmedLabel || !trimmedHost) return;
    const next: HyperDeck = {
      id: crypto.randomUUID(),
      label: trimmedLabel,
      host: trimmedHost,
      port: parsedPort,
      enabled: true,
    };
    onChange([...hyperdecks, next]);
    reset();
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    onChange(hyperdecks.filter((h) => h.id !== id));
  };

  const handleToggle = (id: string, enabled: boolean) => {
    onChange(hyperdecks.map((h) => (h.id === id ? { ...h, enabled } : h)));
  };

  return (
    <div className={styles.section}>
      <Dialog open={dialogOpen} onOpenChange={(_, d) => setDialogOpen(d.open)}>
        <div className={styles.toolbar}>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="primary" icon={<Add24Regular />}>
              Add
            </Button>
          </DialogTrigger>
        </div>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Add HyperDeck</DialogTitle>
            <DialogContent>
              <div className={styles.dialogField}>
                <Field label="Label">
                  <Input
                    value={label}
                    placeholder="ISO A"
                    onChange={(_, d) => setLabel(d.value)}
                  />
                </Field>
              </div>
              <div className={styles.dialogField}>
                <Field label="Host or IP">
                  <Input
                    value={host}
                    placeholder="192.168.1.42"
                    onChange={(_, d) => setHost(d.value)}
                  />
                </Field>
              </div>
              <div className={styles.dialogField}>
                <Field label="Port">
                  <Input
                    value={port}
                    type="number"
                    onChange={(_, d) => setPort(d.value)}
                  />
                </Field>
              </div>
              <Caption1>
                cgtimer connects over the legacy text protocol on TCP/9993.
              </Caption1>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={handleAdd}
                disabled={!label.trim() || !host.trim()}
              >
                Add
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {hyperdecks.length === 0 ? (
        <div className={styles.emptyState}>
          <Body1Strong>No recorders configured.</Body1Strong>
          <div>Click Add to register a HyperDeck.</div>
        </div>
      ) : (
        <Table className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Label</TableHeaderCell>
              <TableHeaderCell>Host</TableHeaderCell>
              <TableHeaderCell>Port</TableHeaderCell>
              <TableHeaderCell>Enabled</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hyperdecks.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{h.label}</TableCell>
                <TableCell>{h.host}</TableCell>
                <TableCell>{h.port}</TableCell>
                <TableCell>
                  <Switch
                    checked={h.enabled}
                    onChange={(_, d) => handleToggle(h.id, d.checked)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    appearance="subtle"
                    icon={<Delete24Regular />}
                    onClick={() => handleDelete(h.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
