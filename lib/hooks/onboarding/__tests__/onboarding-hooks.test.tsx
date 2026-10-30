// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createWrapper } from "@/components/onboarding/__tests__/onboarding-test-utils";
import * as api from "@/lib/api/onboarding";
import { useCampaignOnboarding, useMarkPlayerSheetSeen, useOnboardingFlags, useOnboardingHint, useWhatsNew } from "@/lib/hooks/onboarding";
import { WHATS_NEW_SHOWN } from "@/lib/onboarding/whats-new";

vi.mock("@/lib/api/onboarding", async () => (await import("@/components/onboarding/__tests__/onboarding-test-utils")).onboardingApiMock());

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: { "whats-new": WHATS_NEW_SHOWN[WHATS_NEW_SHOWN.length - 1].id }, audiences: ["dm", "player"] });
});

describe("useOnboardingHint", () => {
  it("показується, dismiss ховає одразу й пише прапорець", async () => {
    const { result } = renderHook(() => useOnboardingHint("dm.races"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.visible).toBe(true));
    act(() => result.current.dismiss());

    await waitFor(() => expect(result.current.visible).toBe(false));
    expect(vi.mocked(api.setOnboardingFlag).mock.calls[0][0]).toEqual({ key: "hint:dm.races", value: null });
  });

  it("поки прапорці не завантажені або впали — не показується", async () => {
    vi.mocked(api.getOnboardingFlags).mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useOnboardingHint("dm.races"), { wrapper: createWrapper() });

    expect(result.current.visible).toBe(false);
    await waitFor(() => expect(api.getOnboardingFlags).toHaveBeenCalled());
    expect(result.current.visible).toBe(false);
  });
});

describe("useWhatsNew", () => {
  it("непобачені → markSeen ставить найновіший id", async () => {
    const { result } = renderHook(() => useWhatsNew(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.unseen.length).toBe(WHATS_NEW_SHOWN.length - 1));
    act(() => result.current.markSeen());

    await waitFor(() => expect(result.current.unseen).toEqual([]));
    expect(vi.mocked(api.setOnboardingFlag).mock.calls[0][0]).toEqual({ key: "whats-new", value: WHATS_NEW_SHOWN[0].id });
  });
});

describe("useCampaignOnboarding", () => {
  it("hide → state hidden і прапорець checklist:<id>", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "open", steps: [], requiredDone: 0, requiredTotal: 6 });

    const { result } = renderHook(() => useCampaignOnboarding("camp"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data?.state).toBe("open"));
    act(() => result.current.hide());

    await waitFor(() => expect(result.current.data?.state).toBe("hidden"));
    expect(vi.mocked(api.setOnboardingFlag).mock.calls[0][0]).toEqual({ key: "checklist:camp", value: "hidden" });
  });
});

describe("useOnboardingFlags.reset", () => {
  it("checklists — перезапитує чеклісти кампаній", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "hidden", steps: [], requiredDone: 0, requiredTotal: 6 });

    const wrapper = createWrapper();

    const { result } = renderHook(() => ({ flags: useOnboardingFlags(), campaign: useCampaignOnboarding("camp") }), { wrapper });

    await waitFor(() => expect(result.current.campaign.data?.state).toBe("hidden"));
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "open", steps: [], requiredDone: 0, requiredTotal: 6 });
    act(() => result.current.flags.reset("checklists"));

    await waitFor(() => expect(result.current.campaign.data?.state).toBe("open"));
    expect(vi.mocked(api.resetOnboarding).mock.calls[0][0]).toBe("checklists");
  });
});

describe("useMarkPlayerSheetSeen", () => {
  it("ставить seen:player-sheet один раз, якщо його ще немає", async () => {
    const { rerender } = renderHook(() => useMarkPlayerSheetSeen(), { wrapper: createWrapper() });

    await waitFor(() => expect(api.setOnboardingFlag).toHaveBeenCalledTimes(1));
    rerender();
    expect(vi.mocked(api.setOnboardingFlag).mock.calls[0][0]).toEqual({ key: "seen:player-sheet", value: null });
    expect(api.setOnboardingFlag).toHaveBeenCalledTimes(1);
  });
});

describe("невдалий запис прапорця", () => {
  it("повертає серверний стан замість оптимістичного", async () => {
    vi.mocked(api.setOnboardingFlag).mockRejectedValueOnce(new Error("down"));

    const { result } = renderHook(() => useOnboardingHint("dm.races"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.visible).toBe(true));
    act(() => result.current.dismiss());

    await waitFor(() => expect(api.getOnboardingFlags).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.visible).toBe(true));
  });
});
