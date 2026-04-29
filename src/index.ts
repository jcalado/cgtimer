import { app, BrowserWindow, ipcMain, Menu, screen, Display } from "electron";
import path from "node:path";
import { autoUpdater } from "electron-updater";
import settings, { getDisplays } from './settings';
import oscListener from "./osc";
import store from "./store";
import type { StoreSchema } from "./store";

import {
  add,
  differenceInMilliseconds,
  isPast,
  parse,
} from "date-fns";

// In development, electron-vite sets ELECTRON_RENDERER_URL environment variable
// In production, we load from the out/renderer directory

const isMac = process.platform === "darwin";
const isDebug = process.env.NODE_ENV === "development";
const appSettings = new settings();
let mainWindow: BrowserWindow | null = null;
let timer: NodeJS.Timeout;
let layoutShortcuts: string[] = [];

const getDisplayOrigin = (display: Display) => {
  if (display.bounds) {
    return { x: display.bounds.x, y: display.bounds.y };
  }

  const nativeOrigin = (display as any).nativeOrigin;
  return {
    x: nativeOrigin?.x || 0,
    y: nativeOrigin?.y || 0,
  };
};

const findPreferredDisplay = (displays: Display[]) => {
  const targetDisplayId = store.get("application.display");
  const targetLabel = store.get("application.displayLabel") || "";
  const targetX = store.get("application.displayX");
  const targetY = store.get("application.displayY");

  // 1. Match by id (stable on macOS, sometimes unstable elsewhere).
  const byId = displays.find(
    (display) => display.id.toString() === String(targetDisplayId)
  );
  if (byId) return byId;

  // 2. Fall back to label (e.g. "Studio Display") — survives id resets.
  if (targetLabel) {
    const byLabel = displays.find((display) => display.label === targetLabel);
    if (byLabel) return byLabel;
  }

  // 3. Fall back to remembered origin — handles unlabeled monitors.
  if (targetX !== 0 || targetY !== 0) {
    const byOrigin = displays.find((display) => {
      const origin = getDisplayOrigin(display);
      return origin.x === targetX && origin.y === targetY;
    });
    if (byOrigin) return byOrigin;
  }

  return null;
};

const refreshDisplaySignature = (display: Display) => {
  const origin = getDisplayOrigin(display);
  store.set("application.display", display.id);
  store.set("application.displayLabel", display.label || "");
  store.set("application.displayX", origin.x);
  store.set("application.displayY", origin.y);
};

const moveWindowToPreferredDisplay = (window: BrowserWindow) => {
  if (!window || window.isDestroyed()) {
    return;
  }

  const displays = screen.getAllDisplays();
  const matched = findPreferredDisplay(displays);
  const targetDisplay = matched || screen.getPrimaryDisplay();

  if (!targetDisplay) {
    return;
  }

  // Whenever we successfully match the configured preference, refresh the
  // stored signature so reconnects on platforms with unstable display ids
  // can still be matched by label or origin next time.
  if (matched) {
    refreshDisplaySignature(matched);
  }

  const { width, height } = window.getBounds();
  const { x, y } = getDisplayOrigin(targetDisplay);
  window.setBounds({ x, y, width, height }, false);

  const shouldBeFullscreen = !!store.get("application.fullscreen");
  if (window.isFullScreen() !== shouldBeFullscreen) {
    window.setFullScreen(shouldBeFullscreen);
  }
};

const registerDisplayChangeHandlers = (window: BrowserWindow) => {
  const reposition = () => moveWindowToPreferredDisplay(window);

  screen.on("display-added", reposition);
  screen.on("display-removed", reposition);
  screen.on("display-metrics-changed", reposition);

  window.on("closed", () => {
    screen.removeListener("display-added", reposition);
    screen.removeListener("display-removed", reposition);
    screen.removeListener("display-metrics-changed", reposition);
  });
};

const createWindow = (): void => {
  const osc = new oscListener(
    // Layout load callback
    (layoutName: string) => {
      if (mainWindow) {
        mainWindow.webContents.send("layout:load", layoutName);
      }
    },
    // Timer command callback
    (name: string, action: string, value?: number) => {
      if (mainWindow) {
        mainWindow.webContents.send("osc-timer:command", { name, action, value });
      }
    }
  );

  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    fullscreen: false,
    height: 600,
    width: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
    },
    autoHideMenuBar: false,
  });

  moveWindowToPreferredDisplay(mainWindow);
  registerDisplayChangeHandlers(mainWindow);

  ipcMain.on("display:reset", () => {
    mainWindow?.webContents.send("display:reset");
  });

  ipcMain.on("window:toggle-fullscreen", () => {
    if (mainWindow) {
      const isFullscreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullscreen);
      // Notify renderer of state change
      mainWindow.webContents.send("window:fullscreen-state", !isFullscreen);
    }
  });

  ipcMain.on("window:get-fullscreen-state", () => {
    if (mainWindow) {
      const isFullscreen = mainWindow.isFullScreen();
      mainWindow.webContents.send("window:fullscreen-state", isFullscreen);
    }
  });

  // Listen for native fullscreen changes (e.g., F11 key)
  mainWindow.on("enter-full-screen", () => {
    mainWindow?.webContents.send("window:fullscreen-state", true);
  });

  mainWindow.on("leave-full-screen", () => {
    mainWindow?.webContents.send("window:fullscreen-state", false);
  });

  // and load the index.html of the app.
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on("closed", () => {
    clearInterval(timer);
    timer = null;
    mainWindow = null;
  });

  const buildMenu = () =>
    Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [
          {
            label: "Edit Layout",
            accelerator: "CmdOrCtrl+E",
            click: () => {
              mainWindow?.webContents.send("layout:edit");
            },
          },
          {
            label: "Preferences",
            click: () => {
              appSettings.show();
            },
          },
          isMac ? { role: "close" } : { role: "quit" },
        ],
      },
      {
        label: "Layouts",
        submenu:
          layoutShortcuts.length > 0
            ? layoutShortcuts.slice(0, 9).map((label, index) => ({
                label: `${index + 1}. ${label}`,
                accelerator: `CmdOrCtrl+${index + 1}`,
                click: () => mainWindow?.webContents.send("layout:load", label),
              }))
            : [{ label: "No layouts yet", enabled: false }],
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
    ]);

  Menu.setApplicationMenu(buildMenu());

  timer = setInterval(() => {
    mainWindow?.webContents.send("timers:update", {
      currentTime: osc.currentTime,
      totalTime: osc.totalTime,
      remainingTime: osc.remainingTime,
      loop: osc.loop,
      stopped: osc.stopped,
      enableProductionClock: store.get("production.enable"),
      enableOntime: store.get("production.ontime"),
      ontimeCurrent: osc.ontimeCurrent,
      elapsedColor: store.get("colors.elapsed"),
      remainingColor: store.get("colors.remaining"),
      clockColor: store.get("colors.clock"),
      productionColor: store.get("colors.production"),
      startTime: store.get("production.start"),
      runtime: runtimeClock(
        store.get("production.start"),
        store.get("production.runtime")
      ),
      timezoneClocks: store.get("timezones.clocks") || [],
    });
  }, 200);
};

const runtimeClock = (startTime: string, runtime: string) => {

  if (!startTime || !runtime) {
    return "00:00:00";
  }

  const timeFormat = /^(\d{2}:\d{2}:\d{2})$/;

  if (!timeFormat.test(startTime) || !timeFormat.test(runtime)) {
    return "00:00:00";
  }

  const runtimeDate = parse(runtime, "HH:mm:ss", new Date());
  const startDate = parse(startTime, "HH:mm:ss", new Date());
  const endDate = add(startDate, {
    hours: runtimeDate.getHours(),
    minutes: runtimeDate.getMinutes(),
    seconds: runtimeDate.getSeconds(),
  });

  if (isPast(startDate)) {
    const diff = differenceInMilliseconds(endDate, new Date());
    return new Date(diff).toISOString().substr(11, 8);
  } else {
    const diff = differenceInMilliseconds(startDate, new Date());

    return new Date(diff).toISOString().substr(11, 8);
  }
};

// IPC handlers for settings
ipcMain.handle("settings:get", (): StoreSchema => {
  return {
    server: store.get("server"),
    application: store.get("application"),
    production: store.get("production"),
    colors: store.get("colors"),
    timezones: store.get("timezones"),
  };
});

ipcMain.handle("settings:save", (_, settings: StoreSchema) => {
  store.set("server", settings.server);
  store.set("application", settings.application);
  store.set("production", settings.production);
  store.set("colors", settings.colors);
  store.set("timezones", settings.timezones);

  // Refresh the display signature so a freshly-picked monitor can be
  // re-matched after a disconnect even if its id changes.
  const displays = screen.getAllDisplays();
  const picked = displays.find(
    (display) => display.id.toString() === String(settings.application.display)
  );
  if (picked) {
    refreshDisplaySignature(picked);
  }

  if (mainWindow) {
    moveWindowToPreferredDisplay(mainWindow);
  }
  mainWindow?.webContents.send("settings:changed", settings);
});

ipcMain.handle("settings:reset", (): StoreSchema => {
  store.clear();
  return {
    server: store.get("server"),
    application: store.get("application"),
    production: store.get("production"),
    colors: store.get("colors"),
    timezones: store.get("timezones"),
  };
});

ipcMain.handle("displays:get", () => {
  return getDisplays();
});

ipcMain.on("preferences:open", (_event, tab?: string) => {
  appSettings.show(tab);
});

ipcMain.on("menubar:set-visible", (_event, visible: boolean) => {
  mainWindow?.setMenuBarVisibility(!!visible);
});

ipcMain.on("layouts:update", (_event, layoutNames: string[]) => {
  layoutShortcuts = layoutNames;
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [
          {
            label: "Edit Layout",
            accelerator: "CmdOrCtrl+E",
            click: () => {
              mainWindow?.webContents.send("layout:edit");
            },
          },
          {
            label: "Preferences",
            click: () => {
              appSettings.show();
            },
          },
          isMac ? { role: "close" } : { role: "quit" },
        ],
      },
      {
        label: "Layouts",
        submenu:
          layoutShortcuts.length > 0
            ? layoutShortcuts.slice(0, 9).map((label, index) => ({
                label: `${index + 1}. ${label}`,
                accelerator: `CmdOrCtrl+${index + 1}`,
                click: () => mainWindow?.webContents.send("layout:load", label),
              }))
            : [{ label: "No layouts yet", enabled: false }],
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
    ])
  );
});

// Check for updates using electron-updater
app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
