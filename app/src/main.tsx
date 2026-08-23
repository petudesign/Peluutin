import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { App } from "./App";
import { analytics } from "./analytics";
import { AnalyticsConsent } from "./components/AnalyticsConsent";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

analytics.init();

createRoot(root).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
    <AnalyticsConsent />
    <Analytics />
  </React.StrictMode>,
);
