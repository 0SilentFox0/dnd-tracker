// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/character-progression";
import { progressionKey, useLevelUpCelebration } from "@/lib/hooks/skills";

vi.mock("@/lib/api/character-progression");

afterEach(cleanup);

describe("useLevelUpCelebration", () => {
  it("після закриття оверлея кеш прогресу має seenLevel = level, тож повторне відкриття не показує анімацію", async () => {
    const dto = { treeId: null, tree: null, race: "Ельф", raceIcon: null, level: 5, seenLevel: 3, isOwner: true, isDM: false, unlocked: [], skills: {}, branches: {} };

    vi.mocked(api.getCharacterProgression).mockResolvedValue(dto);
    vi.mocked(api.markLevelSeen).mockResolvedValue({ seenLevel: 5 });

    const qc = new QueryClient();

    qc.setQueryData(progressionKey("c", "ch"), dto);

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useLevelUpCelebration("c", "ch"), { wrapper });

    expect(result.current.celebration).toMatchObject({ from: 3, to: 5 });

    await waitFor(() => expect(api.markLevelSeen).toHaveBeenCalled());
    act(() => result.current.dismiss());

    expect(qc.getQueryData<{ seenLevel: number }>(progressionKey("c", "ch"))?.seenLevel).toBe(5);
    expect(result.current.celebration).toBeNull();
  });

  it("ДМ, що сам власник персонажа, не бачить оверлея й не скидає seenLevel", async () => {
    const dto = { treeId: null, tree: null, race: "Ельф", raceIcon: null, level: 5, seenLevel: 3, isOwner: true, isDM: true, unlocked: [], skills: {}, branches: {} };

    vi.mocked(api.getCharacterProgression).mockResolvedValue(dto);
    vi.mocked(api.markLevelSeen).mockClear();

    const qc = new QueryClient();

    qc.setQueryData(progressionKey("c", "ch"), dto);

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useLevelUpCelebration("c", "ch"), { wrapper });

    expect(result.current.celebration).toBeNull();
    await new Promise((r) => setTimeout(r, 0));
    expect(api.markLevelSeen).not.toHaveBeenCalled();
  });
});
