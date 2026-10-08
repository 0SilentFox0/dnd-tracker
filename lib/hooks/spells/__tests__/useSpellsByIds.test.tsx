// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/spells";
import { usePrefetchSpellsByIds, useSpellsByIds } from "@/lib/hooks/spells";

vi.mock("@/lib/api/spells");

afterEach(cleanup);

const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };

describe("useSpellsByIds", () => {
  beforeEach(() => {
    vi.mocked(api.getSpellsByIds).mockReset();
    vi.mocked(api.getSpellsByIds).mockResolvedValue([]);
  });

  it("запитує унікальні id у стабільному порядку", async () => {
    renderHook(() => useSpellsByIds("c", ["b", "a", "b"]), { wrapper: wrap(new QueryClient()) });

    await waitFor(() => expect(api.getSpellsByIds).toHaveBeenCalledWith("c", ["a", "b"]));
  });

  it("без id або вимкнений — без запиту", async () => {
    renderHook(() => useSpellsByIds("c", []), { wrapper: wrap(new QueryClient()) });
    renderHook(() => useSpellsByIds("c", ["a"], { enabled: false }), { wrapper: wrap(new QueryClient()) });
    await new Promise((r) => setTimeout(r, 0));

    expect(api.getSpellsByIds).not.toHaveBeenCalled();
  });

  it("префетч у простої кладе дані в той самий кеш, що читає книга", async () => {
    const qc = new QueryClient();

    vi.mocked(api.getSpellsByIds).mockResolvedValue([{ id: "a", name: "Іскра", level: 1, dice: 1 }]);
    renderHook(() => usePrefetchSpellsByIds("c", ["a"]), { wrapper: wrap(qc) });

    await waitFor(() => expect(api.getSpellsByIds).toHaveBeenCalledTimes(1), { timeout: 3000 });

    const { result } = renderHook(() => useSpellsByIds("c", ["a"]), { wrapper: wrap(qc) });

    await waitFor(() => expect(result.current.data?.[0]?.id).toBe("a"));
    expect(api.getSpellsByIds).toHaveBeenCalledTimes(1);
  });
});
