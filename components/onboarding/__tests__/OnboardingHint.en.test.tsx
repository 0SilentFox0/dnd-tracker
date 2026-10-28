// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createWrapper } from "@/components/onboarding/__tests__/onboarding-test-utils";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import * as api from "@/lib/api/onboarding";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");
vi.unmock("@/components/onboarding/OnboardingHint");
vi.mock("@/lib/api/onboarding", async () => (await import("@/components/onboarding/__tests__/onboarding-test-utils")).onboardingApiMock());

afterEach(cleanup);

describe("OnboardingHint in English", () => {
  it("dm.races shows the English title without Cyrillic or raw keys", async () => {
    vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: {}, audiences: ["dm"] });

    const Wrapper = createWrapper();

    const { container } = await renderWithIntl(
      <Wrapper>
        <OnboardingHint id="dm.races" />
      </Wrapper>,
      { locale: "en", namespaces: ["common", "onboarding"] },
    );

    expect(await screen.findByRole("link", { name: "Learn more" })).toBeTruthy();
    expect(container.textContent).not.toMatch(/[А-Яа-яІіЇїЄє]/);
    expect(container.textContent).not.toContain("hints.");
  });
});
