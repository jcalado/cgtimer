import React, { useState } from "react";
import {
  Button,
  Caption1,
  Field,
  Input,
  Switch,
  TableCell,
  TableRow,
} from "@fluentui/react-components";
import { Delete24Regular } from "@fluentui/react-icons";
import {
  SettingsList,
  useSettingsListStyles,
} from "../components/SettingsList";

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

const DEFAULT_PORT = 9993;

export const RecordersSettings: React.FC<RecordersSettingsProps> = ({
  hyperdecks,
  onChange,
}) => {
  const styles = useSettingsListStyles();
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
    onChange([
      ...hyperdecks,
      {
        id: crypto.randomUUID(),
        label: trimmedLabel,
        host: trimmedHost,
        port: parsedPort,
        enabled: true,
      },
    ]);
    reset();
    setDialogOpen(false);
  };

  const handleDelete = (id: string) =>
    onChange(hyperdecks.filter((h) => h.id !== id));

  const handleToggle = (id: string, enabled: boolean) =>
    onChange(hyperdecks.map((h) => (h.id === id ? { ...h, enabled } : h)));

  return (
    <SettingsList
      items={hyperdecks}
      columns={["Label", "Host", "Port", "Enabled", "Actions"]}
      emptyTitle="No recorders configured."
      emptyHint="Click Add to register a HyperDeck."
      dialogOpen={dialogOpen}
      onDialogOpenChange={(open) => {
        if (!open) reset();
        setDialogOpen(open);
      }}
      dialogTitle="Add HyperDeck"
      canAdd={!!label.trim() && !!host.trim()}
      onAdd={handleAdd}
      dialogContent={
        <>
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
        </>
      }
      renderRow={(h) => (
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
      )}
    />
  );
};
