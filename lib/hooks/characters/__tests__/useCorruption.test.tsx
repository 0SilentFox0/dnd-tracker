// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const notify = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/corruption", () => ({ postCorruptionGrant: vi.fn(), postCorruptionUndo: vi.fn() }));
vi.mock("@/lib/hooks/common", async (orig) => ({ ...(await orig<object>()), useOptionalNotify: () => notify }));

import { ApiError } from "@/lib/api/client";
import { postCorruptionGrant, postCorruptionUndo } from "@/lib/api/corruption";
import { useGrantCorruption, useUndoCorruption } from "@/lib/hooks/characters";

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>;

describe("useCorruption errors", () => {
  it("shows the server text of an in-battle grant rejection", async () => {
    vi.mocked(postCorruptionGrant).mockRejectedValueOnce(new ApiError("Hero is in battle", 409, "/u", { error: "Hero is in battle" }));

    const { result } = renderHook(() => useGrantCorruption("c", "h"), { wrapper });

    expect(await act(() => result.current.mutateOk({ points: 1, reason: "x" }))).toBe(false);
    expect(notify).toHaveBeenLastCalledWith("Hero is in battle");
  });

  it("shows the server text of a stale undo", async () => {
    vi.mocked(postCorruptionUndo).mockRejectedValueOnce(new ApiError("Stale grant", 409, "/u", { error: "Stale grant" }));

    const { result } = renderHook(() => useUndoCorruption("c", "h"), { wrapper });

    expect(await act(() => result.current.mutateOk({ grantId: "g" }))).toBe(false);
    expect(notify).toHaveBeenLastCalledWith("Stale grant");
  });
});
