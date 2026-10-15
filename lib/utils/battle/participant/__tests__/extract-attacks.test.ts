import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { extractAttacksFromCharacter } from "@/lib/utils/battle/participant/extract-attacks";
import type { CharacterFromPrisma } from "@/lib/utils/battle/types/participant";

const bow = { id: "bow", campaignId: "c", name: "Лук", slot: "range_weapon", ...weaponStatsColumns({ damageDice: "1d8", damageType: "piercing", attackType: "ranged", range: "150 ft" }) } as unknown as Prisma.ArtifactGetPayload<object>;

const hero = (equipped: Record<string, string> | null) => ({ campaignId: "c", inventory: equipped ? { equipped } : null }) as unknown as CharacterFromPrisma;

describe("extractAttacksFromCharacter", () => {
  it("герой без зброї має дефолтні ближню й дальню атаки лише з кубиками рівня", async () => {
    const attacks = await extractAttacksFromCharacter(hero(null), {});

    expect(attacks.map((a) => [a.id, a.type, a.damageDice, a.damageType])).toEqual([
      ["default-melee", "melee", "", "physical"],
      ["default-ranged", "ranged", "", "physical"],
    ]);
  });

  it("зброя свого виду замінює дефолтну атаку, решта лишається", async () => {
    const attacks = await extractAttacksFromCharacter(hero({ range_weapon: "bow" }), { bow });

    expect(attacks.map((a) => a.id)).toEqual(["bow", "default-melee"]);
  });
});
