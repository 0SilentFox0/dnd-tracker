// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/characters", () => ({
  updateCharacter: vi.fn(async () => ({})),
  levelUpCharacter: vi.fn(async () => ({})),
  createCharacter: vi.fn(async () => ({})),
  deleteCharacter: vi.fn(async () => undefined),
  deleteAllCharacters: vi.fn(async () => ({ success: true, deleted: 0 })),
  getCharacter: vi.fn(),
  getCharacters: vi.fn(),
}));

import { useCreateCharacter, useLevelUpCharacter, useUpdateCharacter } from "@/lib/hooks/characters";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { useDeleteAllCharacters, useDeleteCharacter } from "@/lib/hooks/characters/useCharacters";

const run = (mutation: { mutateAsync: (vars: never) => Promise<unknown> }) => mutation.mutateAsync as (vars: unknown) => Promise<unknown>;

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

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["battle-balance", "c"] }));
  });

  it("підняття рівня", async () => {
    const { invalidate, wrapper } = setup();

    const { result } = renderHook(() => useLevelUpCharacter("c"), { wrapper });

    await act(() => result.current.mutateAsync("ch"));

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["battle-balance", "c"] }));
    // бейдж і оверлей нового рівня читають лист: він не має чекати staleTime
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: characterKeys.sheet("c") }));
  });

  it.each([
    ["створення", () => run(useCreateCharacter("c")), {}],
    ["видалення", () => run(useDeleteCharacter("c")), "ch"],
    ["видалення всіх", () => run(useDeleteAllCharacters("c")), undefined],
  ] as const)("%s — ще й ростер героїв", async (_name, hook, vars) => {
    const { invalidate, wrapper } = setup();

    const { result } = renderHook(hook, { wrapper });

    await act(() => result.current(vars));

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["battle-balance", "c"] }));
    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: characterKeys.roster("c") }));
  });
});
