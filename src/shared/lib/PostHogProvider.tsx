"use client";

import { useEffect } from "react";
import { initPostHog } from "./posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(function initAnalytics() {
    initPostHog();
  }, []);

  return <>{children}</>;
}
