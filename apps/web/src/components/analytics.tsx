"use client";
import posthog from "posthog-js";
import { useEffect } from "react";

// Product analytics (PostHog, US Cloud), on only when the server configures a
// project token. Events go through this site's /ingest rewrite. No cookies or
// browser storage (in-memory only), no session recordings, and no people
// profiles until someone is identified. Fake doors tag their clicks with
// `data-ph-capture-attribute-feature`.
export function Analytics({ token }: { token: string }) {
  useEffect(() => {
    posthog.init(token, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2025-05-24",
      capture_pageview: "history_change",
      persistence: "memory",
      disable_session_recording: true,
      person_profiles: "identified_only",
    });
  }, [token]);
  return null;
}
