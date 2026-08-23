import type { PostHog } from "posthog-js";
import { matchDurationBucket, type MatchDurationBucket } from "./analyticsEvents";

const CONSENT_KEY = "peluutin-analytics-consent-v1";
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com";

export type AnalyticsConsent = "granted" | "denied";

type AnalyticsEvents = {
  application_opened: { module: "matches" | "exercises" };
  analytics_consent_updated: { choice: AnalyticsConsent };
  feature_opened: { module: "matches" | "exercises" };
  team_created: { source: "onboarding" | "settings" };
  match_created: { source: "new" | "scheduled" };
  match_completed: { saved: boolean; duration_bucket: MatchDurationBucket };
};

let clientPromise: Promise<PostHog> | null = null;

const getClient = () => {
  if (!POSTHOG_KEY) return null;
  if (clientPromise) return clientPromise;

  clientPromise = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      capture_exceptions: false,
      capture_pageleave: false,
      capture_pageview: false,
      disable_session_recording: true,
      opt_out_capturing_by_default: true,
      person_profiles: "never",
      persistence: "localStorage",
    });
    return posthog;
  });

  return clientPromise;
};

export const analytics = {
  isConfigured: () => Boolean(POSTHOG_KEY),

  getConsent: (): AnalyticsConsent | null => {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  },

  init: () => {
    if (analytics.getConsent() === "granted") {
      analytics.track("application_opened", {
        module: window.location.hash === "#harjoitteet" ? "exercises" : "matches",
      });
    }
  },

  setConsent: (choice: AnalyticsConsent) => {
    localStorage.setItem(CONSENT_KEY, choice);
    if (!POSTHOG_KEY) return;

    if (choice === "granted") {
      void getClient()?.then((posthog) => {
        posthog.opt_in_capturing();
        analytics.track("analytics_consent_updated", { choice });
        analytics.track("application_opened", {
          module: window.location.hash === "#harjoitteet" ? "exercises" : "matches",
        });
      });
      return;
    }

    void clientPromise?.then((posthog) => posthog.opt_out_capturing());
  },

  track: <Event extends keyof AnalyticsEvents>(event: Event, properties: AnalyticsEvents[Event]) => {
    if (analytics.getConsent() !== "granted") return;
    void getClient()?.then((posthog) => {
      if (analytics.getConsent() !== "granted") return;
      posthog.capture(event, {
        schema_version: 1,
        sport: "football",
        ...properties,
      });
    });
  },

  matchCompleted: (saved: boolean, seconds: number) => {
    analytics.track("match_completed", { saved, duration_bucket: matchDurationBucket(seconds) });
  },
};
