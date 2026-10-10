// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/inventory", () => ({ transferArtifact: vi.fn().mockResolvedValue({ from: {}, to: {} }) }));

import { transferArtifact } from "@/lib/api/inventory";
import { useTransferArtifact } from "@/lib/hooks/characters";

describe("useTransferArtifact", () => {
  it("передає артефакт і інвалідує листи, ростер та деталі", async () => {
    const qc = new QueryClient();

    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useTransferArtifact("c", "ch"), { wrapper });

    await act(() => result.current.mutateAsync({ slot: "helmet", toCharacterId: "b" }));

    expect(transferArtifact).toHaveBeenCalledWith("c", "ch", { slot: "helmet", toCharacterId: "b" });
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["character-sheet", "c"] }));
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["character-roster", "c"] }));
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["character", "c"] }));
  });
});
