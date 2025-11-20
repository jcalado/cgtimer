import React from "react";
import { createRoot } from "react-dom/client";
import { PreferencesWindow } from "./PreferencesWindow";

const root = createRoot(document.getElementById("root")!);
root.render(<PreferencesWindow />);
