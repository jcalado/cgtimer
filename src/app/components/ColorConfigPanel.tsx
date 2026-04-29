import {
  Body1Strong,
  Button,
  Input,
  Switch,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { WidgetNode, WidgetSettings } from "../lib/layout-types";
import { ConfigRow } from "./ConfigRow";
import { ColorSwatchInput } from "./ColorSwatchInput";

const useStyles = makeStyles({
  popover: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    minWidth: "260px",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    columnGap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
  },
});

export const getWidgetColors = (
  settings?: WidgetSettings
): { labelColor?: string; faceColor?: string; backgroundColor?: string } => ({
  labelColor: settings?.labelColor || undefined,
  faceColor: settings?.faceColor || undefined,
  backgroundColor: settings?.backgroundColor || undefined,
});

export type ColorConfigPanelProps = {
  node: WidgetNode;
  onChange: (updates: WidgetSettings) => void;
  onClose: () => void;
};

export const ColorConfigPanel = ({
  node,
  onChange,
  onClose,
}: ColorConfigPanelProps) => {
  const styles = useStyles();
  const colors = getWidgetColors(node.settings);
  const showLabel = node.settings?.showLabel !== false;
  const customLabel = node.settings?.customLabel ?? "";

  const handleReset = () => {
    onChange({
      labelColor: undefined,
      faceColor: undefined,
      backgroundColor: undefined,
      showLabel: true,
      customLabel: undefined,
    });
  };

  return (
    <div className={styles.popover}>
      <Body1Strong>Widget settings</Body1Strong>

      <ConfigRow label="Show label">
        <Switch
          checked={showLabel}
          onChange={(_e, data) => onChange({ showLabel: data.checked })}
        />
      </ConfigRow>

      <ConfigRow label="Custom label">
        <Input
          size="small"
          value={customLabel}
          placeholder="Default"
          disabled={!showLabel}
          onChange={(_e, data) =>
            onChange({ customLabel: data.value || undefined })
          }
        />
      </ConfigRow>

      <ConfigRow label="Label color">
        <ColorSwatchInput
          value={colors.labelColor}
          defaultValue="#aaaaaa"
          onChange={(value) => onChange({ labelColor: value })}
          disabled={!showLabel}
        />
      </ConfigRow>

      <ConfigRow label="Foreground">
        <ColorSwatchInput
          value={colors.faceColor}
          defaultValue="#e5e9ff"
          onChange={(value) => onChange({ faceColor: value })}
        />
      </ConfigRow>

      <ConfigRow label="Background">
        <ColorSwatchInput
          value={colors.backgroundColor}
          defaultValue="#242424"
          onChange={(value) => onChange({ backgroundColor: value })}
        />
      </ConfigRow>

      <div className={styles.footer}>
        <Button appearance="subtle" onClick={handleReset}>
          Reset
        </Button>
        <Button appearance="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
};
