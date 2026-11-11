// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/systems/wfrp/api/characters", () => ({ advanceCharacter: vi.fn(), undoCharacterAdvance: vi.fn() }));

import { characterKeys } from "@/lib/hooks/characters/keys";
import { advanceCharacter, undoCharacterAdvance } from "@/systems/wfrp/api/characters";
import { useAdvance } from "@/systems/wfrp/hooks";
import type { Character } from "@/types/characters";

const result = { characteristics: { advances: { ws: 1 } }, experience: 100, available: 75, entry: {} };

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  qc.setQueryData(characterKeys.detail("c", "ch"), { id: "ch", name: "Hero", experience: 100 } as Character);

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, ...renderHook(() => useAdvance("c", "ch"), { wrapper }) };
}

describe("useAdvance", () => {
  it("buy patches the cached character from the response without refetching it", async () => {
    vi.mocked(advanceCharacter).mockResolvedValueOnce(result as never);

    const { qc, result: hook } = setup();

    const invalidate = vi.spyOn(qc, "invalidateQueries");

    await act(() => hook.current.buy({ kind: "characteristic", key: "ws" }));

    expect(advanceCharacter).toHaveBeenCalledWith("c", "ch", { kind: "characteristic", key: "ws" });
    expect(qc.getQueryData<Character>(characterKeys.detail("c", "ch"))).toMatchObject({ name: "Hero", characteristics: { advances: { ws: 1 } }, experience: 100 });
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: characterKeys.sheet("c", "ch") }));
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: characterKeys.detail("c", "ch") }));
  });

  it("exposes the server error message and clears it on the next success", async () => {
    vi.mocked(advanceCharacter).mockRejectedValueOnce(new Error("Not enough XP"));
    vi.mocked(undoCharacterAdvance).mockResolvedValueOnce(result as never);

    const { result: hook } = setup();

    await act(() => hook.current.buy({ kind: "skill", key: "athletics" }));

    await waitFor(() => expect(hook.current.error).toBe("Not enough XP"));

    await act(() => hook.current.undo());

    expect(undoCharacterAdvance).toHaveBeenCalledWith("c", "ch");
    await waitFor(() => expect(hook.current.error).toBeNull());
  });

  it("ignores a second buy while one is in flight", async () => {
    let resolve!: (v: never) => void;

    vi.mocked(advanceCharacter).mockClear();
    vi.mocked(advanceCharacter).mockReturnValueOnce(new Promise((r) => (resolve = r)));

    const { result: hook } = setup();

    await act(async () => {
      const first = hook.current.buy({ kind: "characteristic", key: "ws" });

      const second = hook.current.buy({ kind: "characteristic", key: "ws" });

      resolve(result as never);
      await Promise.all([first, second]);
    });

    expect(advanceCharacter).toHaveBeenCalledTimes(1);
  });

  it("refetches the character detail after a refusal", async () => {
    vi.mocked(advanceCharacter).mockRejectedValueOnce(new Error("Not enough XP"));

    const { qc, result: hook } = setup();

    const invalidate = vi.spyOn(qc, "invalidateQueries");

    await act(() => hook.current.buy({ kind: "skill", key: "athletics" }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: characterKeys.detail("c", "ch") });
  });
});
