// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/onboarding";
import { useCampaignOnboarding, useOnboardingFlags, useOnboardingHint, useWhatsNew } from "@/lib/hooks/onboarding";
import { WHATS_NEW } from "@/lib/onboarding/whats-new";

vi.mock("@/lib/api/onboarding", () => ({
  getOnboardingFlags: vi.fn(),
  setOnboardingFlag: vi.fn(async () => ({ ok: true })),
  resetOnboarding: vi.fn(async () => ({ ok: true })),
  getCampaignOnboarding: vi.fn(),
}));

const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return Wrapper;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getOnboardingFlags).mockResolvedValue({ flags: { "whats-new": WHATS_NEW[WHATS_NEW.length - 1].id }, audiences: ["dm", "player"] });
});

describe("useOnboardingHint", () => {
  it("показується, dismiss ховає одразу й пише прапорець", async () => {
    const { result } = renderHook(() => useOnboardingHint("dm.races"), { wrapper: wrap() });

    await waitFor(() => expect(result.current.visible).toBe(true));
    act(() => result.current.dismiss());

    await waitFor(() => expect(result.current.visible).toBe(false));
    expect(vi.mocked(api.setOnboardingFlag).mock.calls[0][0]).toEqual({ key: "hint:dm.races", value: null });
  });

  it("поки прапорці не завантажені або впали — не показується", async () => {
    vi.mocked(api.getOnboardingFlags).mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useOnboardingHint("dm.races"), { wrapper: wrap() });

    expect(result.current.visible).toBe(false);
    await waitFor(() => expect(api.getOnboardingFlags).toHaveBeenCalled());
    expect(result.current.visible).toBe(false);
  });
});

describe("useWhatsNew", () => {
  it("непобачені → markSeen ставить найновіший id", async () => {
    const { result } = renderHook(() => useWhatsNew(), { wrapper: wrap() });

    await waitFor(() => expect(result.current.unseen.length).toBe(WHATS_NEW.length - 1));
    act(() => result.current.markSeen());

    await waitFor(() => expect(result.current.unseen).toEqual([]));
    expect(vi.mocked(api.setOnboardingFlag).mock.calls[0][0]).toEqual({ key: "whats-new", value: WHATS_NEW[0].id });
  });
});

describe("useCampaignOnboarding", () => {
  it("hide → state hidden і прапорець checklist:<id>", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "open", steps: [], requiredDone: 0, requiredTotal: 6 });

    const { result } = renderHook(() => useCampaignOnboarding("camp"), { wrapper: wrap() });

    await waitFor(() => expect(result.current.data?.state).toBe("open"));
    act(() => result.current.hide());

    await waitFor(() => expect(result.current.data?.state).toBe("hidden"));
    expect(vi.mocked(api.setOnboardingFlag).mock.calls[0][0]).toEqual({ key: "checklist:camp", value: "hidden" });
  });
});

describe("useOnboardingFlags.reset", () => {
  it("checklists — перезапитує чеклісти кампаній", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "hidden", steps: [], requiredDone: 0, requiredTotal: 6 });

    const wrapper = wrap();

    const { result } = renderHook(() => ({ flags: useOnboardingFlags(), campaign: useCampaignOnboarding("camp") }), { wrapper });

    await waitFor(() => expect(result.current.campaign.data?.state).toBe("hidden"));
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "open", steps: [], requiredDone: 0, requiredTotal: 6 });
    act(() => result.current.flags.reset("checklists"));

    await waitFor(() => expect(result.current.campaign.data?.state).toBe("open"));
    expect(vi.mocked(api.resetOnboarding).mock.calls[0][0]).toBe("checklists");
  });
});
