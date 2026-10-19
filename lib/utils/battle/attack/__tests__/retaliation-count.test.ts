import { describe, expect, it } from "vitest";

import { retaliate, retaliateTimes, swordUnit } from "./helpers";

import { extraRetaliations } from "@/data/library/unit-abilities";
import { ParticipantSide } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleParticipant } from "@/types/battle";

const defender = (count?: number) => swordUnit("d", ParticipantSide.ENEMY, count ? [resolved(extraRetaliations(count))] : undefined);

const retaliations = (d: BattleParticipant, tries: number) => retaliateTimes([swordUnit("a", ParticipantSide.ALLY), d], tries);

describe("лічильник відсічей", () => {
  it("Подвійна відсіч: дві відповіді за раунд, третьої немає", () => {
    expect(retaliations(defender(1), 3)).toEqual([true, true, false]);
  });

  it("без вміння: одна відповідь", () => {
    expect(retaliations(defender(), 2)).toEqual([true, false]);
  });

  it("лічильник тримається на учаснику", () => {
    const r = retaliate([swordUnit("a", ParticipantSide.ALLY), defender(1)]);

    const after = r?.participants.find((p) => p.basicInfo.id === "d");

    expect(after?.battleData.retaliationsUsed).toBe(1);
    expect(after?.actionFlags.hasUsedReaction).toBe(false);
  });
});
