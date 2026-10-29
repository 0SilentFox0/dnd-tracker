// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { getCustomConditionUsage, removeCustomConditions } from "@/lib/api/rules";
import { useRemoveCustomCondition } from "@/lib/hooks/campaigns";
import { DEFAULT_RULES } from "@/lib/utils/rules";

vi.mock("@/lib/api/rules", () => ({ getCustomConditionUsage: vi.fn(), removeCustomConditions: vi.fn() }));

const confirm = vi.fn();

vi.mock("@/lib/hooks/common", () => ({ useConfirm: () => confirm, useNotify: () => vi.fn() }));

const EMPTY = { battles: [], spells: [], units: [] };

const USED = { battles: [], spells: [{ id: "s1", name: "Pacify" }], units: [] };

const condition = { key: "custom:x", name: "X" };

describe("useRemoveCustomCondition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(removeCustomConditions).mockResolvedValue(DEFAULT_RULES);
    confirm.mockResolvedValue(true);
  });

  const setup = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    return renderHook(() => useRemoveCustomCondition("c1"), { wrapper });
  };

  it("used condition: no confirm, usage exposed, no mutation", async () => {
    vi.mocked(getCustomConditionUsage).mockResolvedValue(USED);

    const { result } = setup();

    await act(() => result.current.remove(condition));

    expect(confirm).not.toHaveBeenCalled();
    expect(result.current.usage).toEqual(USED);
    expect(removeCustomConditions).not.toHaveBeenCalled();

    act(() => result.current.closeUsage());

    expect(result.current.usage).toBeNull();
  });

  it("unused condition: confirm then remove", async () => {
    vi.mocked(getCustomConditionUsage).mockResolvedValue(EMPTY);

    const { result } = setup();

    await act(() => result.current.remove(condition));

    expect(confirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(removeCustomConditions).toHaveBeenCalledWith("c1", ["custom:x"]));
  });

  it("declined confirm: nothing removed", async () => {
    vi.mocked(getCustomConditionUsage).mockResolvedValue(EMPTY);
    confirm.mockResolvedValue(false);

    const { result } = setup();

    await act(() => result.current.remove(condition));

    expect(removeCustomConditions).not.toHaveBeenCalled();
  });

  it("409 race: refetches usage and shows it", async () => {
    vi.mocked(getCustomConditionUsage).mockResolvedValueOnce(EMPTY).mockResolvedValueOnce(USED);
    vi.mocked(removeCustomConditions).mockRejectedValue(new ApiError("in use", 409, "/rules"));

    const { result } = setup();

    await act(() => result.current.remove(condition));

    expect(result.current.usage).toEqual(USED);
  });
});
