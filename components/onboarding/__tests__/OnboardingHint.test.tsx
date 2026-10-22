// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createWrapper } from "@/components/onboarding/__tests__/onboarding-test-utils";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import * as api from "@/lib/api/onboarding";
import { HINTS } from "@/lib/onboarding/hints";

vi.unmock("@/components/onboarding/OnboardingHint");
vi.mock("@/lib/api/onboarding", async () => (await import("@/components/onboarding/__tests__/onboarding-test-utils")).onboardingApiMock());

const renderIt = (id = "dm.races") => render(<OnboardingHint id={id} />, { wrapper: createWrapper() });

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
