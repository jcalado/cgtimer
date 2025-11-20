import Store, { Schema } from "electron-store";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export interface StoreSchema {
  server: {
    port: number;
    channel: number;
  };
  application: {
    display: number;
    fullscreen: boolean;
  };
  production: {
    enable: boolean;
    start: string;
    runtime: string;
    ontime: boolean;
  };
  colors: {
    clock: string;
    production: string;
    elapsed: string;
    remaining: string;
  };
}

const schema: Schema<StoreSchema> = {
  server: {
    type: "object",
    properties: {
      port: {
        type: "number",
        default: 6251,
        minimum: 1,
        maximum: 65535,
      },
      channel: {
        type: "number",
        default: 1,
        minimum: 1,
      },
    },
  },
  application: {
    type: "object",
    properties: {
      display: {
        type: "number",
        default: 0,
      },
      fullscreen: {
        type: "boolean",
        default: false,
      },
    },
  },
  production: {
    type: "object",
    properties: {
      enable: {
        type: "boolean",
        default: false,
      },
      start: {
        type: "string",
        default: "00:10:00",
        pattern: "^\\d{2}:\\d{2}:\\d{2}$",
      },
      runtime: {
        type: "string",
        default: "00:20:00",
        pattern: "^\\d{2}:\\d{2}:\\d{2}$",
      },
      ontime: {
        type: "boolean",
        default: false,
      },
    },
  },
  colors: {
    type: "object",
    properties: {
      clock: {
        type: "string",
        default: "#960000",
        pattern: "^#[0-9A-Fa-f]{6}$",
      },
      production: {
        type: "string",
        default: "#960000",
        pattern: "^#[0-9A-Fa-f]{6}$",
      },
      elapsed: {
        type: "string",
        default: "#00FF00",
        pattern: "^#[0-9A-Fa-f]{6}$",
      },
      remaining: {
        type: "string",
        default: "#FF0000",
        pattern: "^#[0-9A-Fa-f]{6}$",
      },
    },
  },
};

// Default values for the store
const defaults: StoreSchema = {
  server: {
    port: 6251,
    channel: 1,
  },
  application: {
    display: 0,
    fullscreen: false,
  },
  production: {
    enable: false,
    start: "00:10:00",
    runtime: "00:20:00",
    ontime: false,
  },
  colors: {
    clock: "#960000",
    production: "#960000",
    elapsed: "#00FF00",
    remaining: "#FF0000",
  },
};

// Create store with error handling for migration from electron-preferences
const store = (() => {
  try {
    return new Store<StoreSchema>({
      schema: schema,
      name: "preferences",
      defaults: defaults,
      clearInvalidConfig: true,
    });
  } catch (error) {
    // If there's a schema validation error, it means we're migrating from old format
    // Delete the old config and create a new one with defaults
    const configPath = path.join(app.getPath("userData"), "preferences.json");
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    // Create new store with defaults
    return new Store<StoreSchema>({
      schema: schema,
      name: "preferences",
      defaults: defaults,
    });
  }
})();

export default store;
