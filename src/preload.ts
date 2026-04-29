// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, screen } from "electron";
import type { StoreSchema } from "./store";
import type { DisplayInfo } from "./shared/entities";

export const api = {
    send: (channel: any, data?: any) => {
        ipcRenderer.send(channel, data);
    },
    receive: (channel: any, handler: any) => {
        ipcRenderer.on(channel, (...args) => handler(...args));
    },
    removeListener: (channel: any, handler: any) => {
        ipcRenderer.removeListener(channel, (...args) => handler(...args));

    }
};

export const electronAPI = {
    getSettings: (): Promise<StoreSchema> => ipcRenderer.invoke("settings:get"),
    saveSettings: (settings: StoreSchema): Promise<void> =>
        ipcRenderer.invoke("settings:save", settings),
    resetSettings: (): Promise<StoreSchema> => ipcRenderer.invoke("settings:reset"),
    getDisplays: (): Promise<DisplayInfo[]> =>
        ipcRenderer.invoke("displays:get"),
    onSettingsChange: (callback: (settings: StoreSchema) => void) => {
        ipcRenderer.on("settings:changed", (_, settings) => callback(settings));
    },
};

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("electronAPI", electronAPI);