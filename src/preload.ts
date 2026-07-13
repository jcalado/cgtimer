// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import type { StoreSchema } from "./store";
import type { DisplayInfo } from "./shared/entities";

type IpcHandler = (...args: unknown[]) => void;

export const api = {
    send: (channel: string, data?: unknown) => {
        ipcRenderer.send(channel, data);
    },
    /**
     * Subscribe to an IPC channel and get back an unsubscribe function.
     * Function identity is not guaranteed to survive the context bridge, so
     * a later removeListener(handler) call cannot reliably match the wrapper
     * registered here; the returned closure is the only safe way to detach.
     */
    receive: (channel: string, handler: IpcHandler): (() => void) => {
        const wrapper = (...args: unknown[]) => handler(...args);
        ipcRenderer.on(channel, wrapper);
        return () => {
            ipcRenderer.removeListener(channel, wrapper);
        };
    },
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