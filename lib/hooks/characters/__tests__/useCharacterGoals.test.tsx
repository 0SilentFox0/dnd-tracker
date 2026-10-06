// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/characters", () => ({ putCharacterGoals: vi.fn().mockResolvedValue({ goals: [{ id: "p", text: "Нова", status: "active", author: "player" }] }) }));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => vi.fn() }));

import { characterSheetKey, useCharacterGoals } from "@/lib/hooks/characters";

describe("useCharacterGoals", () => {
  it("після збереження кладе цілі з відповіді сервера в кеш листа", async () => {
    const qc = new QueryClient();

    qc.setQueryData(characterSheetKey("c", "ch"), { story: { biography: null, goals: [] } });

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useCharacterGoals("c", "ch"), { wrapper });

    await act(() => result.current.save([{ id: "p", text: "Нова", status: "active" }]));

    expect(qc.getQueryData<{ story: { goals: unknown[] } }>(characterSheetKey("c", "ch"))?.story.goals).toEqual([{ id: "p", text: "Нова", status: "active", author: "player" }]);
  });
});
