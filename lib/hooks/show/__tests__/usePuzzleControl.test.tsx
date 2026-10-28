// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { showKeys } from "../keys";
import { usePuzzleControl } from "../usePuzzleControl";

import { sendPuzzle } from "@/lib/api/show";

vi.mock("@/lib/api/show", () => ({ sendPuzzle: vi.fn() }));

describe("usePuzzleControl", () => {
  it("будь-яка помилка повідомляє, інвалідує кеш і дає false", async () => {
    vi.mocked(sendPuzzle).mockRejectedValue(new Error("network"));

    const client = new QueryClient();

    const invalidate = vi.spyOn(client, "invalidateQueries");

    const onFailure = vi.fn();

    const { result } = renderHook(() => usePuzzleControl("c1", onFailure), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });

    expect(await result.current.send({ action: "puzzleReturn", pieceId: "p0-0" })).toBe(false);
    expect(onFailure).toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: showKeys.state("c1") });
  });
});
