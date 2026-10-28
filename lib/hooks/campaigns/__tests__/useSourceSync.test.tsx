// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import { applySourceChanges } from "@/lib/api/source-sync";
import { useApplySourceChanges, useSourceSyncApply, useSourceSyncSelection } from "@/lib/hooks/campaigns";
import { campaignKeys } from "@/lib/hooks/campaigns/keys";
import type { SourceApplyResult, SourceDiffItem } from "@/types/campaigns";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api/source-sync", () => ({ applySourceChanges: vi.fn(), getSourceDiff: vi.fn() }));

const item = (over: Partial<SourceDiffItem>): SourceDiffItem => ({
  scope: "spells",
  key: "k",
  localId: null,
  name: "X",
  status: "new",
  changedFields: [],
  sourceHash: "h",
  requires: [],
  ...over,
});

describe("useApplySourceChanges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("applies, refreshes and invalidates only this campaign's queries", async () => {
    vi.mocked(applySourceChanges).mockResolvedValue({} as SourceApplyResult);

    const client = new QueryClient();

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    client.setQueryData(["spells", "c1"], []);
    client.setQueryData(["spells", "c2"], []);

    const { result } = renderHook(() => useApplySourceChanges("c1"), { wrapper });

    const ref = { scope: "spells", key: "k", sourceHash: "h", status: "new" } as const;

    await act(() => result.current.mutateAsync({ apply: [ref], ignore: [] }));

    expect(applySourceChanges).toHaveBeenCalledWith("c1", { apply: [ref], ignore: [] });
    expect(refresh).toHaveBeenCalled();
    expect(client.getQueryState(["spells", "c1"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["spells", "c2"])?.isInvalidated).toBe(false);
  });
});

describe("useApplySourceChanges: side effects", () => {
  beforeEach(() => vi.clearAllMocks());

  const setup = () => {
    const client = new QueryClient();

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    client.setQueryData(["spells", "c1"], []);
    client.setQueryData(campaignKeys.sourceDiff("c1"), {});

    return { client, ...renderHook(() => useApplySourceChanges("c1"), { wrapper }) };
  };

  it("ignore-only success refetches just the diff", async () => {
    vi.mocked(applySourceChanges).mockResolvedValue({} as SourceApplyResult);

    const { client, result } = setup();

    await act(() => result.current.mutateAsync({ apply: [], ignore: [] }));

    expect(refresh).not.toHaveBeenCalled();
    expect(client.getQueryState(campaignKeys.sourceDiff("c1"))?.isInvalidated).toBe(true);
    expect(client.getQueryState(["spells", "c1"])?.isInvalidated).toBe(false);
  });

  it("an error other than 409 invalidates nothing", async () => {
    vi.mocked(applySourceChanges).mockRejectedValue(new Error("boom"));

    const { client, result } = setup();

    await act(() => result.current.mutateAsync({ apply: [], ignore: [] }).catch(() => undefined));

    expect(refresh).not.toHaveBeenCalled();
    expect(client.getQueryState(campaignKeys.sourceDiff("c1"))?.isInvalidated).toBe(false);
  });

  it("a 409 refetches the diff only, without refreshing the page", async () => {
    vi.mocked(applySourceChanges).mockRejectedValue(new ApiError("stale", 409, "/x"));

    const { client, result } = setup();

    await act(() => result.current.mutateAsync({ apply: [], ignore: [] }).catch(() => undefined));

    expect(refresh).not.toHaveBeenCalled();
    expect(client.getQueryState(campaignKeys.sourceDiff("c1"))?.isInvalidated).toBe(true);
    expect(client.getQueryState(["spells", "c1"])?.isInvalidated).toBe(false);
  });
});

describe("useSourceSyncSelection", () => {
  const a = item({ key: "a", status: "new" });

  const b = item({ key: "b", status: "updated" });

  const c = item({ key: "c", status: "conflict" });

  it("starts from defaults, toggles, sets groups and yields refs", () => {
    const items = [a, b, c];

    const { result } = renderHook(() => useSourceSyncSelection(items));

    expect(result.current.isSelected(a)).toBe(true);
    expect(result.current.isSelected(c)).toBe(false);

    act(() => result.current.toggle(a));
    expect(result.current.isSelected(a)).toBe(false);

    act(() => result.current.toggle(a));
    expect(result.current.isSelected(a)).toBe(true);

    act(() => result.current.toggle(c));
    expect(result.current.refs.map((r) => r.key)).toEqual(["a", "b", "c"]);

    act(() => result.current.setGroup("spells", false));
    expect(result.current.refs).toEqual([]);
    expect(result.current.selected.size).toBe(0);
  });

  it("resets to defaults when a new items array arrives", () => {
    const { result, rerender } = renderHook(({ items }) => useSourceSyncSelection(items), { initialProps: { items: [a, b] } });

    act(() => result.current.toggle(a));
    expect(result.current.isSelected(a)).toBe(false);

    rerender({ items: [a, b, c] });
    expect(result.current.isSelected(a)).toBe(true);
    expect(result.current.isSelected(c)).toBe(false);
  });
});

describe("useSourceSyncApply", () => {
  beforeEach(() => vi.clearAllMocks());

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

  const body = { apply: [], ignore: [] };

  const noItems: SourceDiffItem[] = [];

  it("a 409 sets the stale notice, not an error; run and reset clear it", async () => {
    vi.mocked(applySourceChanges).mockRejectedValueOnce(new ApiError("stale", 409, "/x"));

    const { result } = renderHook(() => useSourceSyncApply("c1", noItems), { wrapper });

    act(() => result.current.run(body, vi.fn()));
    await waitFor(() => expect(result.current.staleNotice).toBe(true));
    expect(result.current.error).toBeNull();

    act(() => result.current.reset());
    expect(result.current.staleNotice).toBe(false);
  });

  it("other errors expose the message and clear on the next run", async () => {
    vi.mocked(applySourceChanges).mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({} as SourceApplyResult);

    const { result } = renderHook(() => useSourceSyncApply("c1", noItems), { wrapper });

    act(() => result.current.run(body, vi.fn()));
    await waitFor(() => expect(result.current.error).toBe("boom"));

    act(() => result.current.run(body, vi.fn()));
    expect(result.current.error).toBeNull();
  });
});
