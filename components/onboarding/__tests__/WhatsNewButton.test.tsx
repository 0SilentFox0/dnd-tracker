// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createWrapper } from "@/components/onboarding/__tests__/onboarding-test-utils";
import { WhatsNewButton } from "@/components/onboarding/WhatsNewButton";
import * as api from "@/lib/api/onboarding";
import { WHATS_NEW_SHOWN } from "@/lib/onboarding/whats-new";

vi.mock("@/lib/api/onboarding", async () => (await import("@/components/onboarding/__tests__/onboarding-test-utils")).onboardingApiMock());

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: { "whats-new": WHATS_NEW_SHOWN[WHATS_NEW_SHOWN.length - 1].id }, audiences: ["dm", "player"] });
});

describe("WhatsNewButton", () => {
  it("бейдж із кількістю; відкриття показує записи з міткою «нове» й позначає побаченим", async () => {
    render(<WhatsNewButton />, { wrapper: createWrapper() });

    expect(await screen.findByText(String(WHATS_NEW_SHOWN.length - 1))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /whatsNew\.ui\.button/ }));

    expect(await screen.findByText(`whatsNew.${WHATS_NEW_SHOWN[0].id}.title`)).toBeTruthy();
    expect(vi.mocked(api.setOnboardingFlag).mock.calls[0][0]).toEqual({ key: "whats-new", value: WHATS_NEW_SHOWN[0].id });
    await waitFor(() => expect(screen.queryByText(String(WHATS_NEW_SHOWN.length - 1))).toBeNull());
    expect(screen.getAllByText(/whatsNew\.ui\.new/)).toHaveLength(WHATS_NEW_SHOWN.length - 1);
  });
});
