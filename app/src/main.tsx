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

const PreviewApp = () => {
  const isPreviewTest = window.location.hostname.endsWith(".vercel.app")
    && window.location.hostname !== "peluutin.vercel.app"
    && new URLSearchParams(window.location.search).has("test-error-tracking");
  if (isPreviewTest) throw new Error("PRIVATE_CANARY_error_tracking_test");
  return <App />;
};

createRoot(root).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <PreviewApp />
    </AppErrorBoundary>
    <AnalyticsConsent />
    <Analytics />
  </React.StrictMode>,
);
