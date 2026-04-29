import { BrowserWindow } from "electron";
import path from "node:path";

let preferencesWindow: BrowserWindow | null = null;

export function createPreferencesWindow(initialTab?: string): void {
  if (preferencesWindow && !preferencesWindow.isDestroyed()) {
    preferencesWindow.focus();
    if (initialTab) {
      preferencesWindow.webContents.send("preferences:select-tab", initialTab);
    }
    return;
  }

  preferencesWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    title: "Preferences",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
    autoHideMenuBar: true,
  });

  const hash = initialTab ? `#${initialTab}` : "";
  if (process.env.ELECTRON_RENDERER_URL) {
    preferencesWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/preferences.html${hash}`);
  } else {
    preferencesWindow.loadFile(path.join(__dirname, '../renderer/preferences.html'), {
      hash: initialTab || undefined,
    });
  }

  preferencesWindow.on("closed", () => {
    preferencesWindow = null;
  });
}

export function getPreferencesWindow(): BrowserWindow | null {
  return preferencesWindow;
}
