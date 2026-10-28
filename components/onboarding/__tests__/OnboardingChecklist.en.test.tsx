// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createWrapper } from "@/components/onboarding/__tests__/onboarding-test-utils";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import * as api from "@/lib/api/onboarding";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");
vi.unmock("@/components/onboarding/OnboardingChecklist");
vi.mock("@/lib/api/onboarding", async () => (await import("@/components/onboarding/__tests__/onboarding-test-utils")).onboardingApiMock());

afterEach(cleanup);

describe("OnboardingChecklist in English", () => {
  it("pending-variant step has English text without Cyrillic or raw keys", async () => {
    vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: {}, audiences: ["dm"] });
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({
      role: "dm",
      state: "open",
      steps: [{ id: "characters", variant: { name: "pending", params: { count: 2 } }, href: "/campaigns/c/dm/characters", helpSlug: "dm-quickstart", optional: false, informational: false, done: false }],
      requiredDone: 0,
      requiredTotal: 1,
    });

    const Wrapper = createWrapper();

    const { container } = await renderWithIntl(
      <Wrapper>
        <OnboardingChecklist campaignId="c" />
      </Wrapper>,
      { locale: "en", namespaces: ["common", "onboarding"] },
    );

    expect(await screen.findByText("0/1")).toBeTruthy();
    expect(container.textContent).not.toMatch(/[А-Яа-яІіЇїЄє]/);
    expect(container.textContent).not.toContain("checklist.");
    expect(container.textContent).not.toContain("onboarding.");
  });
});
