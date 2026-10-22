// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WhatsNewButton } from "@/components/onboarding/WhatsNewButton";
import * as api from "@/lib/api/onboarding";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";

vi.mock("@/lib/api/onboarding", () => ({
  getOnboardingFlags: vi.fn(async () => ({ flags: { "whats-new": WHATS_NEW[WHATS_NEW.length - 1].id }, audiences: ["dm", "player"] })),
  setOnboardingFlag: vi.fn(async () => ({ ok: true })),
  resetOnboarding: vi.fn(),
  getCampaignOnboarding: vi.fn(),
}));

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

afterEach(cleanup);

const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

describe("WhatsNewButton", () => {
  it("бейдж із кількістю; відкриття показує записи з міткою «нове» й позначає побаченим", async () => {
    render(<WhatsNewButton />, { wrapper: Wrapper });

    expect(await screen.findByText(String(WHATS_NEW.length - 1))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Що нового/ }));

    expect(await screen.findByText(WHATS_NEW[0].title)).toBeTruthy();
    expect(vi.mocked(api.setOnboardingFlag).mock.calls[0][0]).toEqual({ key: "whats-new", value: WHATS_NEW[0].id });
    await waitFor(() => expect(screen.queryByText(String(WHATS_NEW.length - 1))).toBeNull());
    expect(screen.getAllByText(/· нове/)).toHaveLength(WHATS_NEW.length - 1);
  });
});
