import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

export function onboardingApiMock() {
  return {
    getOnboardingFlags: vi.fn(),
    setOnboardingFlag: vi.fn(async () => ({ ok: true })),
    resetOnboarding: vi.fn(async () => ({ ok: true })),
    getCampaignOnboarding: vi.fn(),
  };
}

export function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return Wrapper;
}
