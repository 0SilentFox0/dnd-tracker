// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as progressionApi from "@/lib/api/character-progression";
import { characterSheetKey } from "@/lib/hooks/characters";
import { useLevelUpCelebration } from "@/lib/hooks/skills";
import type { CharacterSheet } from "@/types/characters";

vi.mock("@/lib/api/character-progression");
vi.mock("@/lib/api/characters");

afterEach(cleanup);

const sheet = (isDM: boolean) => ({ viewer: { isDM, isOwner: true }, progression: { freePoints: 2, level: 5, seenLevel: 3 } }) as unknown as CharacterSheet;

const setup = (isDM: boolean) => {
  const qc = new QueryClient();

  qc.setQueryData(characterSheetKey("c", "ch"), sheet(isDM));

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, ...renderHook(() => useLevelUpCelebration("c", "ch"), { wrapper }) };
};

describe("useLevelUpCelebration", () => {
  it("читає рівні з листа; після закриття кеш листа має seenLevel = level", async () => {
    vi.mocked(progressionApi.markLevelSeen).mockResolvedValue({ seenLevel: 5 });

    const { qc, result } = setup(false);

    expect(result.current.celebration).toEqual({ from: 3, to: 5, free: 2 });

    await waitFor(() => expect(progressionApi.markLevelSeen).toHaveBeenCalledWith("c", "ch"));
    act(() => result.current.dismiss());

    expect(qc.getQueryData<CharacterSheet>(characterSheetKey("c", "ch"))?.progression.seenLevel).toBe(5);
    expect(result.current.celebration).toBeNull();
  });

  it("оновлення листа з сервера (seenLevel уже = level) не закриває відкритий оверлей", async () => {
    vi.mocked(progressionApi.markLevelSeen).mockResolvedValue({ seenLevel: 5 });

    const { qc, result } = setup(false);

    expect(result.current.celebration).toEqual({ from: 3, to: 5, free: 2 });

    act(() => qc.setQueryData(characterSheetKey("c", "ch"), { ...sheet(false), progression: { freePoints: 1, level: 5, seenLevel: 5 } }));

    await waitFor(() => expect(result.current.celebration).toEqual({ from: 3, to: 5, free: 1 }));

    act(() => result.current.dismiss());

    expect(result.current.celebration).toBeNull();
  });

  it("ДМ, що сам власник персонажа, не бачить оверлея й не скидає seenLevel", async () => {
    vi.mocked(progressionApi.markLevelSeen).mockClear();

    const { result } = setup(true);

    expect(result.current.celebration).toBeNull();
    await new Promise((r) => setTimeout(r, 0));
    expect(progressionApi.markLevelSeen).not.toHaveBeenCalled();
  });
});
