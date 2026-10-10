// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/inventory", () => ({ updateInventory: vi.fn().mockResolvedValue({}) }));

import { updateInventory } from "@/lib/api/inventory";
import { useEquipArtifact } from "@/lib/hooks/characters";

describe("useEquipArtifact", () => {
  it("після екіпірування інвалідує лист персонажа", async () => {
    const qc = new QueryClient();

    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useEquipArtifact("c", "ch"), { wrapper });

    await act(() => result.current.mutateAsync({ slot: "armor", artifactId: "a1" }));

    expect(updateInventory).toHaveBeenCalledWith("c", "ch", { equipSlot: { slot: "armor", artifactId: "a1" } });
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["character-sheet", "c", "ch"] }));
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["character-roster", "c"] }));
  });
});
