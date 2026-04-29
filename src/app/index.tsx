import React from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webDarkTheme } from "@fluentui/react-components";
import App from "./app";

const element = document.getElementById("app") as HTMLElement;
const root = createRoot(element);
root.render(
  <FluentProvider
    theme={webDarkTheme}
    style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
  >
    <App />
  </FluentProvider>
);
