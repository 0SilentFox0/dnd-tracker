// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { getCampaignRules, updateCampaignRules } from "@/lib/api/rules";
import { useRulesForm } from "@/lib/hooks/campaigns";
import { DEFAULT_RULES } from "@/lib/utils/rules";

vi.mock("@/lib/api/rules", () => ({ getCampaignRules: vi.fn(), updateCampaignRules: vi.fn() }));

describe("useRulesForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCampaignRules).mockResolvedValue(DEFAULT_RULES);
    vi.mocked(updateCampaignRules).mockImplementation(async (_id, patch) => ({ ...DEFAULT_RULES, ...patch }) as typeof DEFAULT_RULES);
  });

  const setup = async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </QueryClientProvider>
    );

    const view = renderHook(() => useRulesForm("c1"), { wrapper });

    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    return view;
  };

  it("starts from the server rules and is clean", async () => {
    const { result } = await setup();

    expect(result.current.form.data).toEqual(DEFAULT_RULES);
    expect(result.current.isDirty).toBe(false);
  });

  it("set marks the form dirty and save patches only changed sections", async () => {
    const { result } = await setup();

    act(() => result.current.form.set("morale", { enabled: false, cap: 3 }));

    expect(result.current.isDirty).toBe(true);

    await act(() => result.current.save());

    expect(updateCampaignRules).toHaveBeenCalledWith("c1", { morale: { enabled: false, cap: 3 } });
    expect(result.current.isDirty).toBe(false);
  });

  it("setting a value back to the server one is not dirty", async () => {
    const { result } = await setup();

    act(() => result.current.form.set("morale", { enabled: false, cap: 3 }));
    act(() => result.current.form.set("morale", DEFAULT_RULES.morale));

    expect(result.current.isDirty).toBe(false);
  });

  it("fills empty dice cells with the default progression on save", async () => {
    const { result } = await setup();

    act(() => result.current.form.set("heroScaling", { ...DEFAULT_RULES.heroScaling, meleeDiceByLevel: { 1: "2d6" } }));

    await act(() => result.current.save());

    const patch = vi.mocked(updateCampaignRules).mock.calls[0][1];

    const table = patch.heroScaling?.meleeDiceByLevel;

    expect(Object.keys(table ?? {})).toHaveLength(20);
    expect(table?.["1"]).toBe("2d6");
    expect(table?.["2"]).toBe("1d6");
  });

  it("reset returns the server data", async () => {
    const { result } = await setup();

    act(() => result.current.form.set("initiative", { heroMin: 1, heroMax: 2, mode: "static" }));
    act(() => result.current.reset());

    expect(result.current.form.data).toEqual(DEFAULT_RULES);
    expect(result.current.isDirty).toBe(false);
  });
});
