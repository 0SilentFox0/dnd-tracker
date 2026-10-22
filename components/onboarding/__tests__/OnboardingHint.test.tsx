// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import * as api from "@/lib/api/onboarding";
import { HINTS } from "@/lib/onboarding/hints";

vi.mock("@/lib/api/onboarding", () => ({
  getOnboardingFlags: vi.fn(),
  setOnboardingFlag: vi.fn(async () => ({ ok: true })),
  resetOnboarding: vi.fn(),
  getCampaignOnboarding: vi.fn(),
}));

const renderIt = (id = "dm.races") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return render(<OnboardingHint id={id} />, { wrapper: Wrapper });
};

afterEach(cleanup);

beforeEach(() => vi.clearAllMocks());

describe("OnboardingHint", () => {
  it("показує текст і посилання на статтю, хрестик ховає", async () => {
    vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: {}, audiences: ["dm"] });
    renderIt();

    expect(await screen.findByText(HINTS["dm.races"].title)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Детальніше" }).getAttribute("href")).toBe(`/help/${HINTS["dm.races"].helpSlug}`);
    fireEvent.click(screen.getByRole("button", { name: "Закрити підказку" }));

    await waitFor(() => expect(screen.queryByText(HINTS["dm.races"].title)).toBeNull());
  });

  it("усі підказки сховані — нічого", async () => {
    vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: { "hint:*": null }, audiences: ["dm"] });

    const { container } = renderIt();

    await waitFor(() => expect(api.getOnboardingFlags).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("невідомий id — нічого", async () => {
    vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: {}, audiences: ["dm"] });

    const { container } = renderIt("nope");

    await waitFor(() => expect(api.getOnboardingFlags).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("помилка API — нічого", async () => {
    vi.mocked(api.getOnboardingFlags).mockRejectedValue(new Error("down"));

    const { container } = renderIt();

    await waitFor(() => expect(api.getOnboardingFlags).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});
