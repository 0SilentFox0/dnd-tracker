// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createWrapper } from "@/components/onboarding/__tests__/onboarding-test-utils";
import { WhatsNewButton } from "@/components/onboarding/WhatsNewButton";
import * as api from "@/lib/api/onboarding";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { WHATS_NEW_SHOWN } from "@/lib/onboarding/whats-new";

vi.unmock("next-intl");
vi.mock("@/lib/api/onboarding", async () => (await import("@/components/onboarding/__tests__/onboarding-test-utils")).onboardingApiMock());

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

afterEach(cleanup);

describe("WhatsNewButton in English", () => {
  it("lists entries in English without Cyrillic or raw keys", async () => {
    vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: {}, audiences: ["dm", "player"] });

    const Wrapper = createWrapper();

    await renderWithIntl(
      <Wrapper>
        <WhatsNewButton />
      </Wrapper>,
      { locale: "en", namespaces: ["common", "whatsNew"] },
    );

    fireEvent.click(await screen.findByRole("button", { name: /What's new/ }));

    const dialog = await screen.findByRole("dialog");

    expect(dialog.textContent).toContain("What's new");
    expect(dialog.textContent).not.toMatch(/[А-Яа-яІіЇїЄє]/);
    expect(dialog.textContent).not.toContain(WHATS_NEW_SHOWN[0].id + ".");
  });
});
