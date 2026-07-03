import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { App } from "@/app/app";
import React from "react";
import ReactDOM from "react-dom/client";
import "@/app/globals.css";

// biome-ignore lint/style/noNonNullAssertion: #root existe en index.html
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
