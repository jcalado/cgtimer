import Store, { Schema } from "electron-store";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { HyperDeck, TimezoneClock } from "./shared/entities";

export interface StoreSchema {
  server: {
    /** CasparCG address for AMCP; empty string disables the client. */
    host: string;
    amcpPort: number;
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
    clocks: TimezoneClock[];
  };
  recorders: {
    hyperdecks: HyperDeck[];
  };
  mixer: {
    /** X32/M32 console address; empty string disables the client. */
    x32Host: string;
    x32Port: number;
  };
  companion: {
    /** Bitfocus Companion address; empty string disables announcements. */
    host: string;
    port: number;
    /** Companion custom variable set to the active layout name. */
    variable: string;
  };
}

const schema: Schema<StoreSchema> = {
  server: {
    type: "object",
    properties: {
      host: {
        type: "string",
        default: "",
      },
      amcpPort: {
        type: "number",
        default: 5250,
        minimum: 1,
        maximum: 65535,
      },
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
  mixer: {
    type: "object",
    properties: {
      x32Host: {
        type: "string",
        default: "",
      },
      x32Port: {
        type: "number",
        default: 10023,
        minimum: 1,
        maximum: 65535,
      },
    },
  },
  companion: {
    type: "object",
    properties: {
      host: {
        type: "string",
        default: "",
      },
      port: {
        type: "number",
        default: 12321,
        minimum: 1,
        maximum: 65535,
      },
      variable: {
        type: "string",
        default: "cgtimer_layout",
      },
    },
  },
};

// Default values for the store
const defaults: StoreSchema = {
  server: {
    host: "",
    amcpPort: 5250,
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
  mixer: {
    x32Host: "",
    x32Port: 10023,
  },
  companion: {
    host: "",
    port: 12321,
    variable: "cgtimer_layout",
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
  } catch {
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
