import {
  Body1,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { WidgetDefinition } from "../lib/layout-types";
import { Readiness } from "../lib/widget-readiness";

const LEVEL_COLORS: Record<string, string> = {
  ready: "#22c55e",
  unconfigured: "#888",
  waiting: "#f59e0b",
  offline: "#dc2626",
  brokenRef: "#f59e0b",
};

const LEVEL_LABELS: Record<string, string> = {
  ready: "Receiving data",
  unconfigured: "Not configured",
  waiting: "Configured, waiting for data",
  offline: "Offline",
  brokenRef: "Broken reference",
};

const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalM,
  },
  heading: {
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  status: {
    display: "flex",
    alignItems: "baseline",
    columnGap: tokens.spacingHorizontalS,
  },
  statusDot: {
    fontSize: "10px",
    lineHeight: 1,
  },
  steps: {
    margin: 0,
    paddingLeft: tokens.spacingHorizontalXXL,
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
  },
});

export type WidgetHelpDialogProps = {
  open: boolean;
  widget: WidgetDefinition;
  readiness: Readiness;
  /** Shared integration steps, already {oscPort}-interpolated. */
  setupSteps: string[];
  /** Widget-specific hint, already interpolated. */
  setupHint: string;
  /** "Last packet: ..." line for OSC-fed sources. */
  lastData?: string;
  onClose: () => void;
};

/**
 * Edit-mode help modal opened from the (?) button on a widget card: what the
 * widget shows, how to read it, live source status, and setup steps with a
 * deep link to the right preferences tab.
 */
export function WidgetHelpDialog({
  open,
  widget,
  readiness,
  setupSteps,
  setupHint,
  lastData,
  onClose,
}: WidgetHelpDialogProps) {
  const styles = useStyles();
  const statusColor = LEVEL_COLORS[readiness.level];
  const statusReason = "reason" in readiness ? readiness.reason : undefined;
  const prefsTab = "prefsTab" in readiness ? readiness.prefsTab : widget.prefsTab;

  return (
    <Dialog open={open} onOpenChange={(_e, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{widget.label}</DialogTitle>
          <DialogContent>
            <div className={styles.section}>
              <Body1>{widget.description}</Body1>
            </div>

            <div className={styles.section}>
              <Caption1 className={styles.heading}>How to read it</Caption1>
              <Body1>{widget.reading}</Body1>
            </div>

            <div className={styles.section}>
              <Caption1 className={styles.heading}>Current status</Caption1>
              <div className={styles.status}>
                <span className={styles.statusDot} style={{ color: statusColor }}>
                  ●
                </span>
                <Body1>
                  {LEVEL_LABELS[readiness.level]}
                  {statusReason ? `: ${statusReason}` : ""}
                </Body1>
              </div>
              {lastData && <Caption1>{lastData}</Caption1>}
            </div>

            {(setupSteps.length > 0 || setupHint) && (
              <div className={styles.section}>
                <Caption1 className={styles.heading}>Setup</Caption1>
                {setupSteps.length > 0 && (
                  <ol className={styles.steps}>
                    {setupSteps.map((step, i) => (
                      <li key={i}>
                        <Body1>{step}</Body1>
                      </li>
                    ))}
                  </ol>
                )}
                {setupHint && <Body1>{setupHint}</Body1>}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            {widget.source !== "none" && prefsTab && (
              <Button
                appearance="primary"
                onClick={() => {
                  window.api.send("preferences:open", prefsTab);
                  onClose();
                }}
              >
                Open settings
              </Button>
            )}
            <Button appearance="secondary" onClick={onClose}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
