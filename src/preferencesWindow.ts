import { BrowserWindow } from "electron";
import path from "node:path";

let preferencesWindow: BrowserWindow | null = null;

export function createPreferencesWindow(): void {
  // If window already exists, focus it
  if (preferencesWindow && !preferencesWindow.isDestroyed()) {
    preferencesWindow.focus();
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

  // Load the preferences window
  if (process.env.ELECTRON_RENDERER_URL) {
    // In dev mode, load from the dev server with the preferences route
    preferencesWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/preferences.html`);
  } else {
    preferencesWindow.loadFile(path.join(__dirname, '../renderer/preferences.html'));
  }

  preferencesWindow.on("closed", () => {
    preferencesWindow = null;
  });
}

export function getPreferencesWindow(): BrowserWindow | null {
  return preferencesWindow;
}
