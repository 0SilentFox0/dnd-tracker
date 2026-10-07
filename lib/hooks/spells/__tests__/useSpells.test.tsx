// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/spells", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/spells")>()),
  createSpellGroup: vi.fn(async () => ({ id: "g1", name: "Вогонь" })),
}));

import { useCreateSpellGroup } from "@/lib/hooks/spells";

afterEach(cleanup);

describe("useCreateSpellGroup", () => {
  it("нова група порожня — інвалідує лише список груп, не заклинання", async () => {
    const qc = new QueryClient();

    const spy = vi.spyOn(qc, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useCreateSpellGroup("c1"), { wrapper });

    await act(() => result.current.mutateAsync("Вогонь"));

    expect(spy.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([["spell-groups", "c1"]]);
  });
});
