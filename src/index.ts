import { app, BrowserWindow, ipcMain, Menu, screen } from "electron";
import { updateElectronApp } from "update-electron-app";
import settings from "./settings";
import oscListener from "./osc";

import {
  add,
  differenceInMilliseconds,
  differenceInMinutes,
  differenceInSeconds,
  intervalToDuration,
  isPast,
  parse,
  sub,
} from "date-fns";

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const isMac = process.platform === "darwin";
const isDebug = process.env.NODE_ENV === "development";
let timer: NodeJS.Timeout;

const createWindow = (): void => {
  const appSettings = new settings();
  const targetScreen = screen
    .getAllDisplays()
    .find(
      (display) =>
        display.id.toString() ===
        appSettings.prefs().value("application.display")
    );

  const osc = new oscListener(appSettings.prefs);

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    x: targetScreen?.nativeOrigin?.x || 0,
    y: targetScreen?.nativeOrigin?.y || 0,
    fullscreen: appSettings.prefs().value("application.fullscreen") || false,
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    autoHideMenuBar: true,
  });

  ipcMain.on("display:reset", () => {
    mainWindow.webContents.send("display:reset");
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  if (isDebug) {
    mainWindow.webContents.openDevTools();
  }

  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
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

  Menu.setApplicationMenu(menu);

  timer = setInterval(() => {
    mainWindow.webContents.send("timers:update", {
      currentTime: osc.currentTime,
      totalTime: osc.totalTime,
      remainingTime: osc.remainingTime,
      loop: osc.loop,
      stopped: osc.stopped,
      enableProductionClock: appSettings.prefs().value("production.enable"),
      startTime: appSettings.prefs().value("production.start"),
      runtime: runtimeClock(
        appSettings.prefs().value("production.start"),
        appSettings.prefs().value("production.runtime")
      ),
    });
  }, 200);
};

const runtimeClock = (startTime: string, runtime: string) => {
  if (!startTime || !runtime) {
    return "00:00:00";
  }

  console.log(startTime, runtime);

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

updateElectronApp();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  window.clearInterval(timer);
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
