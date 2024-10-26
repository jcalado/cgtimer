import { app, Menu, screen } from "electron";
import path from "path";
import ElectronPreferences from "electron-preferences";

const displays = () => {
  return screen.getAllDisplays().map((display, index) => {
    return {
      label: `Display ${display.id} - ${display.label}`,
      value: display.id,
    };
  });
};

class Settings {
  prefs: typeof ElectronPreferences;
  constructor() {
    this.prefs = this.preferences;
  }

  public show = () => {
    this.prefs().show();
  };

  private preferences = (): typeof ElectronPreferences => {
    return new ElectronPreferences({
      // Preference default values
      defaults: {
        server: {
          port: 6251,
          channel: 1,
        },
        production: {
          enable: false,
          start: "00:10:00",
          runtime: "00:20:00",
        },
        colors: {
          clock: "#960000",
          production: "#960000",
          elapsed: "#00FF00",
          remaining: "#FF0000",
        }
      },

      dataStore: path.resolve(app.getPath("userData"), "preferences.json"),

      browserWindowOpts: {
        title: "My custom preferences title",
        width: 900,
        maxWidth: 1000,
        height: 700,
        maxHeight: 1000,
        resizable: true,
        maximizable: false,
        //...
      },

      menu: Menu.buildFromTemplate([
        {
          label: "Window",
          role: "window",
          submenu: [
            {
              label: "Close",
              accelerator: "CmdOrCtrl+W",
              role: "close",
            },
          ],
        },
      ]),

      // Preference sections visible to the UI
      sections: [
        {
          id: "server",
          label: "Server",
          icon: "single-01", // See the list of available icons below
          form: {
            groups: [
              {
                label: "Server connection", // optional
                fields: [
                  {
                    label: "Port",
                    key: "port",
                    type: "number",
                    help: "CasparCG OSC Port",
                  },
                  {
                    label: "Channel",
                    key: "channel",
                    type: "number",
                    help: "CasparCG channel",
                  },
                  // ...
                ],
              },
              // ...
            ],
          },
        },
        {
          id: "application",
          label: "Application",
          icon: "settings-gear-63",
          form: {
            groups: [
              {
                label: "Display",
                fields: [
                  {
                    label: "Display",
                    key: "display",
                    type: "dropdown",
                    options: displays(),
                    help: "You might want to set this to an external display.",
                  },
                  {
                    label: "Fullscreen",
                    key: "fullscreen",
                    type: "radio",
                    options: [
                      { label: "No", value: false },
                      { label: "Yes", value: true },
                    ],
                    help: "Start in fullscreen mode",
                  },
                ],
              },
            ],
          },
        },
        {
          id: "production",
          label: "Production",
          icon: "settings-gear-63",
          form: {
            groups: [
              {
                label: "Production",
                fields: [
                  {
                    label: "Enable production clock",
                    key: "enable",
                    type: "radio",
                    options: [
                      { label: "No", value: false },
                      { label: "Yes", value: true },
                    ],
                    help: "Splits clock in two clocks. A live clock and a production clock",
                  },
                  {
                    label: "Start time",
                    key: "start",
                    type: "text",
                    help: "The time the production starts",
                    hideFunction: (preferences: typeof ElectronPreferences) => { return (!preferences.production.enable && !preferences.production.ontime) }
                  },
                  {
                    label: "Runtime",
                    key: "runtime",
                    type: "text",
                    help: "Approximate runtime of the production",
                    hideFunction: (preferences: typeof ElectronPreferences) => { return !preferences.production.enable && !preferences.production.ontime}   
                  },
                  {
                    label: "ontime",
                    key: "ontime",
                    type: "radio",
                    options: [
                      { label: "No", value: false },
                      { label: "Yes", value: true },
                    ],
                    help: "Use ontime for production clock start time and remaining time",
                  }
                ],
              },
            ],
          },
        },
        {
          id: "colors",
          label: "Colors",
          icon: "image",
          form: {
            groups: [
              {
                label: "Clocks",
                fields: [
                  {
                    label: "Clock",
                    key: "clock",
                    type: "color",
                    format: "hex",
                  },
                  {
                    label: "Production",
                    key: "production",
                    type: "color",
                    format: "hex",
                  },
                ],
              },
              {
                label: "Playout clocks",
                fields: [
                  {
                    label: "Elapsed",
                    key: "elapsed",
                    type: "color",
                    format: "hex",
                  },
                  {
                    label: "Remaining",
                    key: "remaining",
                    type: "color",
                    format: "hex",
                  },
                ],
              },
            ],
          }
        }
      ],
    });
  };
}

export default Settings;
