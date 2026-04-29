import React, { useState, useEffect } from "react";
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  makeStyles,
  tokens,
  TabList,
  Tab,
  Button,
} from "@fluentui/react-components";
import {
  ServerRegular,
  AppGenericRegular,
  ClockRegular,
  ColorRegular,
} from "@fluentui/react-icons";
import { ServerSettings } from "./ServerSettings";
import { ApplicationSettings } from "./ApplicationSettings";
import { ColorSettings } from "./ColorSettings";
import { TimezoneSettings } from "./TimezoneSettings";
import type { StoreSchema } from "../../store";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    padding: tokens.spacingVerticalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  title: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
    color: tokens.colorNeutralForeground1,
  },
  content: {
    display: "flex",
    flexDirection: "row",
    flex: 1,
    overflow: "hidden",
  },
  sidebar: {
    width: "200px",
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingVerticalM,
  },
  main: {
    flex: 1,
    overflow: "auto",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalL,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

type TabValue = "server" | "application" | "colors" | "timezones";

const TAB_VALUES: TabValue[] = [
  "server",
  "application",
  "colors",
  "timezones",
];

const isTabValue = (value: string): value is TabValue =>
  (TAB_VALUES as string[]).includes(value);

const initialTabFromHash = (): TabValue => {
  if (typeof window === "undefined") return "server";
  const hash = window.location.hash.replace(/^#/, "");
  return isTabValue(hash) ? hash : "server";
};

export const PreferencesWindow: React.FC = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<TabValue>(initialTabFromHash);

  useEffect(() => {
    const handleSelectTab = (_event: unknown, tab: string) => {
      if (isTabValue(tab)) setSelectedTab(tab);
    };
    window.api?.receive?.("preferences:select-tab", handleSelectTab);
    return () => {
      window.api?.removeListener?.("preferences:select-tab", handleSelectTab);
    };
  }, []);
  const [settings, setSettings] = useState<StoreSchema | null>(null);
  const [isDarkMode] = useState(true);

  useEffect(() => {
    // Load initial settings
    window.electronAPI.getSettings().then((loadedSettings) => {
      console.log("Loaded settings:", loadedSettings);
      // Ensure settings have all required sections with defaults
      setSettings({
        server: loadedSettings?.server || { port: 6251, channel: 1 },
        application:
          loadedSettings?.application ||
          { display: 0, displayLabel: "", displayX: 0, displayY: 0, fullscreen: false },
        colors:
          loadedSettings?.colors ||
          { clock: "#960000", elapsed: "#00FF00", remaining: "#FF0000" },
        timezones: loadedSettings?.timezones || { clocks: [] },
      });
    }).catch((error) => {
      console.error("Error loading settings:", error);
      setSettings({
        server: { port: 6251, channel: 1 },
        application: { display: 0, displayLabel: "", displayX: 0, displayY: 0, fullscreen: false },
        colors: { clock: "#960000", elapsed: "#00FF00", remaining: "#FF0000" },
        timezones: { clocks: [] },
      });
    });
  }, []);

  if (!settings) {
    return (
      <FluentProvider theme={isDarkMode ? webDarkTheme : webLightTheme}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Loading...</h1>
          </div>
        </div>
      </FluentProvider>
    );
  }

  const updateSetting = <K extends keyof StoreSchema>(
    section: K,
    key: keyof StoreSchema[K],
    value: any
  ) => {
    const newSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    };
    setSettings(newSettings);
  };

  const handleSave = () => {
    window.electronAPI.saveSettings(settings);
    window.close();
  };

  const handleCancel = () => {
    window.close();
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      window.electronAPI.resetSettings().then((defaultSettings) => {
        setSettings(defaultSettings);
      });
    }
  };

  return (
    <FluentProvider theme={isDarkMode ? webDarkTheme : webLightTheme}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Preferences</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.sidebar}>
            <TabList
              vertical
              selectedValue={selectedTab}
              onTabSelect={(_, data) =>
                setSelectedTab(data.value as TabValue)
              }
            >
              <Tab value="server" icon={<ServerRegular />}>
                Server
              </Tab>
              <Tab value="application" icon={<AppGenericRegular />}>
                Application
              </Tab>
              <Tab value="colors" icon={<ColorRegular />}>
                Colors
              </Tab>
              <Tab value="timezones" icon={<ClockRegular />}>
                Timezones
              </Tab>
            </TabList>
          </div>

          <div className={styles.main}>
            {selectedTab === "server" && (
              <ServerSettings
                port={settings.server.port}
                channel={settings.server.channel}
                onPortChange={(value) => updateSetting("server", "port", value)}
                onChannelChange={(value) =>
                  updateSetting("server", "channel", value)
                }
              />
            )}

            {selectedTab === "application" && (
              <ApplicationSettings
                display={settings.application.display}
                fullscreen={settings.application.fullscreen}
                onDisplayChange={(value) =>
                  updateSetting("application", "display", value)
                }
                onFullscreenChange={(value) =>
                  updateSetting("application", "fullscreen", value)
                }
              />
            )}

            {selectedTab === "colors" && (
              <ColorSettings
                clock={settings.colors.clock}
                elapsed={settings.colors.elapsed}
                remaining={settings.colors.remaining}
                onClockChange={(value) =>
                  updateSetting("colors", "clock", value)
                }
                onElapsedChange={(value) =>
                  updateSetting("colors", "elapsed", value)
                }
                onRemainingChange={(value) =>
                  updateSetting("colors", "remaining", value)
                }
              />
            )}

            {selectedTab === "timezones" && (
              <TimezoneSettings
                clocks={settings.timezones.clocks}
                clockColor={settings.colors.clock}
                onChange={(clocks) => updateSetting("timezones", "clocks", clocks)}
              />
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <Button onClick={handleReset}>Reset to Defaults</Button>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button appearance="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </FluentProvider>
  );
};
