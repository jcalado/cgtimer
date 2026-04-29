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
    displayLabel: string;
    displayX: number;
    displayY: number;
    fullscreen: boolean;
  };
  colors: {
    clock: string;
    elapsed: string;
    remaining: string;
  };
  timezones: {
    clocks: Array<{
      id: string;
      label: string;
      timezone: string;
      enabled: boolean;
    }>;
  };
  recorders: {
    hyperdecks: Array<{
      id: string;
      label: string;
      host: string;
      port: number;
      enabled: boolean;
    }>;
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
      displayLabel: {
        type: "string",
        default: "",
      },
      displayX: {
        type: "number",
        default: 0,
      },
      displayY: {
        type: "number",
        default: 0,
      },
      fullscreen: {
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
  timezones: {
    type: "object",
    properties: {
      clocks: {
        type: "array",
        default: [],
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            timezone: { type: "string" },
            enabled: { type: "boolean" }
          },
          required: ["id", "label", "timezone", "enabled"]
        }
      }
    }
  },
  recorders: {
    type: "object",
    properties: {
      hyperdecks: {
        type: "array",
        default: [],
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            host: { type: "string" },
            port: { type: "number" },
            enabled: { type: "boolean" },
          },
          required: ["id", "label", "host", "port", "enabled"],
        },
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
    displayLabel: "",
    displayX: 0,
    displayY: 0,
    fullscreen: false,
  },
  colors: {
    clock: "#960000",
    elapsed: "#00FF00",
    remaining: "#FF0000",
  },
  timezones: {
    clocks: [],
  },
  recorders: {
    hyperdecks: [],
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
