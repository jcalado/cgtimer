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
import { ProductionSettings } from "./ProductionSettings";
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

type TabValue = "server" | "application" | "production" | "colors" | "timezones";

export const PreferencesWindow: React.FC = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<TabValue>("server");
  const [settings, setSettings] = useState<StoreSchema | null>(null);
  const [isDarkMode] = useState(true);

  useEffect(() => {
    // Load initial settings
    window.electronAPI.getSettings().then((loadedSettings) => {
      console.log("Loaded settings:", loadedSettings);
      // Ensure settings have all required sections with defaults
      setSettings({
        server: loadedSettings?.server || { port: 6251, channel: 1 },
        application: loadedSettings?.application || { display: 0, fullscreen: false },
        production: loadedSettings?.production || { enable: false, start: "00:10:00", runtime: "00:20:00", ontime: false },
        colors: loadedSettings?.colors || { clock: "#960000", production: "#960000", elapsed: "#00FF00", remaining: "#FF0000" },
        timezones: loadedSettings?.timezones || { clocks: [] },
      });
    }).catch((error) => {
      console.error("Error loading settings:", error);
      // Set defaults on error
      setSettings({
        server: { port: 6251, channel: 1 },
        application: { display: 0, fullscreen: false },
        production: { enable: false, start: "00:10:00", runtime: "00:20:00", ontime: false },
        colors: { clock: "#960000", production: "#960000", elapsed: "#00FF00", remaining: "#FF0000" },
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
              <Tab value="production" icon={<ClockRegular />}>
                Production
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

            {selectedTab === "production" && (
              <ProductionSettings
                enable={settings.production.enable}
                start={settings.production.start}
                runtime={settings.production.runtime}
                ontime={settings.production.ontime}
                onEnableChange={(value) =>
                  updateSetting("production", "enable", value)
                }
                onStartChange={(value) =>
                  updateSetting("production", "start", value)
                }
                onRuntimeChange={(value) =>
                  updateSetting("production", "runtime", value)
                }
                onOntimeChange={(value) =>
                  updateSetting("production", "ontime", value)
                }
              />
            )}

            {selectedTab === "colors" && (
              <ColorSettings
                clock={settings.colors.clock}
                production={settings.colors.production}
                elapsed={settings.colors.elapsed}
                remaining={settings.colors.remaining}
                onClockChange={(value) =>
                  updateSetting("colors", "clock", value)
                }
                onProductionChange={(value) =>
                  updateSetting("colors", "production", value)
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
