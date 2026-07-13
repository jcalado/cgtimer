import { screen } from "electron";
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
}

export default Settings;
