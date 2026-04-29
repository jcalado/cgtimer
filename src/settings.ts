import { screen } from "electron";
import store from "./store";
import { createPreferencesWindow } from "./preferencesWindow";

export const getDisplays = () => {
  return screen.getAllDisplays().map((display, index) => {
    return {
      id: display.id,
      label: `Display ${display.id} - ${display.label || `Monitor ${index + 1}`}`,
    };
  });
};

class Settings {
  public show = (initialTab?: string) => {
    createPreferencesWindow(initialTab);
  };

  public get = (key: string) => {
    return store.get(key as any);
  };

  public set = (key: string, value: any) => {
    store.set(key as any, value);
  };

  public onDidChange = (key: string, callback: (newValue: any, oldValue: any) => void) => {
    return store.onDidChange(key as any, callback);
  };
}

export default Settings;
