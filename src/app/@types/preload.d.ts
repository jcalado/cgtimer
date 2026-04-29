import { api, electronAPI } from '../../preload';

declare global {
    interface Window {
        api: typeof api;
        electronAPI: typeof electronAPI;
    }
}