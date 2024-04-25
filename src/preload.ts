// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

export const api = {
    send: (channel: any, data: any) => {
        ipcRenderer.send(channel, data);
    },
    receive: (channel: any, handler: any) => {
        ipcRenderer.on(channel, (...args) => handler(...args));
    },
    removeListener: (channel: any, handler: any) => {
        ipcRenderer.removeListener(channel, (...args) => handler(...args));

    }
};

contextBridge.exposeInMainWorld("api", api);