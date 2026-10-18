// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import type { BattlePreparationParticipant } from "@/types/battle";

vi.mock("../../useBattleSetupQueries", () => ({
  useBattleBalance: () => ({
    isPending: false,
    mutate: (_vars: unknown, opts: { onSuccess: (d: unknown) => void }) =>
      opts.onSuccess({ suggestedEnemies: [{ unitId: "wolf", quantity: 3 }, { unitId: "bat", quantity: 1 }] }),
  }),
}));

import { useBalanceSuggestions } from "../useBalanceSuggestions";

describe("useBalanceSuggestions", () => {
  it("прийняття пропозиції зберігає резерв ворогів (обмежений кількістю) і не чіпає союзників", () => {
    const participants: BattlePreparationParticipant[] = [
      { id: "h1", type: ParticipantSourceType.CHARACTER, side: ParticipantSide.ALLY, quantity: 1 },
      { id: "wolf", type: ParticipantSourceType.UNIT, side: ParticipantSide.ENEMY, quantity: 5, reserved: 4 },
      { id: "old", type: ParticipantSourceType.UNIT, side: ParticipantSide.ENEMY, quantity: 2, reserved: 2 },
    ];

    const setParticipants = vi.fn();

    const { result } = renderHook(() => useBalanceSuggestions({ campaignId: "c", participants, allyParticipants: { characterIds: ["h1"], units: [] }, hasAllies: true, setParticipants }));

    act(() => result.current.suggestEnemies());
    act(() => result.current.applySuggestedEnemies());

    expect(setParticipants).toHaveBeenCalledWith([
      participants[0],
      { id: "wolf", type: "unit", side: "enemy", quantity: 3, reserved: 3 },
      { id: "bat", type: "unit", side: "enemy", quantity: 1 },
    ]);
  });
});
