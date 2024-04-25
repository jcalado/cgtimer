import { app, Menu } from "electron";
import path from "path";
import ElectronPreferences from "electron-preferences";

class settings {
  prefs: any;
  constructor(){
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
      },
    
      dataStore: path.resolve(app.getPath("userData"), "preferences.json"),
    
      browserWindowOpts: {
        title: 'My custom preferences title',
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
          label: 'Window',
          role: 'window',
          submenu: [
            {
              label: 'Close',
              accelerator: 'CmdOrCtrl+W',
              role: 'close',
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
        // ...
      ],
    });

  }
}

export default settings;
