import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import { ELF_EYE_ABILITY } from "@/scripts/constructor/backfill/elf-eye";
import type { BattleAttack } from "@/types/battle";

const ranged: BattleAttack = { id: "bow", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d6", damageType: "piercing" };

const melee: BattleAttack = { ...ranged, id: "sw", name: "Меч", type: AttackType.MELEE };

const withRace = (race: string, abilities = [] as ReturnType<typeof resolved>[]) => {
  const p = makeParticipant({ id: "a", abilities });

  return { ...p, abilities: { ...p.abilities, race } };
};

describe("elf eye", () => {
  it("a race named elf without the ability gets no advantage", () => {
    const elf = withRace("elf");

    expect(rollModeReasons(elf, ranged).advantage).toEqual([]);
  });

  it("the ability gives advantage on ranged, not on melee", () => {
    const anyone = withRace("human", [resolved(ELF_EYE_ABILITY)]);

    expect(rollModeReasons(anyone, ranged).advantage).toContain("Ельфійське око");
    expect(rollModeReasons(anyone, melee).advantage).toEqual([]);
  });
});
