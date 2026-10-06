// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/characters", () => ({
  updateCharacter: vi.fn(async () => ({})),
  levelUpCharacter: vi.fn(async () => ({})),
  createCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
  deleteAllCharacters: vi.fn(),
  getCharacter: vi.fn(),
  getCharacters: vi.fn(),
}));

import { useLevelUpCharacter, useUpdateCharacter } from "@/lib/hooks/characters";

function setup() {
  const qc = new QueryClient();

  const invalidate = vi.spyOn(qc, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { invalidate, wrapper };
}

describe("мутації персонажа інвалідують баланс бою", () => {
  it("збереження персонажа", async () => {
    const { invalidate, wrapper } = setup();

    const { result } = renderHook(() => useUpdateCharacter("c", "ch"), { wrapper });

    await act(() => result.current.mutateAsync({} as never));

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["battle-balance"] }));
  });

  it("підняття рівня", async () => {
    const { invalidate, wrapper } = setup();

    const { result } = renderHook(() => useLevelUpCharacter("c"), { wrapper });

    await act(() => result.current.mutateAsync("ch"));

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["battle-balance"] }));
  });
});
