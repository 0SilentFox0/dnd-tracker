// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/character-progression";
import { progressionKey, useCharacterProgression } from "@/lib/hooks/skills";

vi.mock("@/lib/api/character-progression");

afterEach(cleanup);

describe("useCharacterProgression", () => {
  it("кешований прогрес перечитується при кожному відкритті (рівень міг змінити ДМ)", async () => {
    const dto = { treeId: null, tree: null, race: "Ельф", raceIcon: null, level: 5, seenLevel: 5, isOwner: true, isDM: false, unlocked: [], skills: {}, branches: {} };

    vi.mocked(api.getCharacterProgression).mockResolvedValue(dto);

    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });

    qc.setQueryData(progressionKey("c", "ch"), dto);

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    renderHook(() => useCharacterProgression("c", "ch"), { wrapper });

    await waitFor(() => expect(api.getCharacterProgression).toHaveBeenCalledWith("c", "ch"));
  });
});
