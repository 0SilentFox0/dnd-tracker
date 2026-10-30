import { describe, expect, it } from "vitest";

import { extractAttacksFromCharacter } from "@/lib/utils/battle/participant/extract-attacks";
import type { CharacterFromPrisma } from "@/lib/utils/battle/types/participant";
import { parseRules } from "@/lib/utils/rules/schema";

const hero = { campaignId: "c", inventory: null } as unknown as CharacterFromPrisma;

describe("базові атаки героя з правил кампанії", () => {
  it("назви беруться з rules.defaultAttacks", async () => {
    const { defaultAttacks } = parseRules({ defaultAttacks: { meleeName: "Кулак", rangedName: "Камінь", weaponName: "Зброя" } });

    const attacks = await extractAttacksFromCharacter(hero, {}, defaultAttacks);

    expect(attacks.map((a) => a.name)).toEqual(["Кулак", "Камінь"]);
  });

  it("без правил — англійські назви за замовчуванням", async () => {
    const attacks = await extractAttacksFromCharacter(hero, {});

    expect(attacks.map((a) => a.name)).toEqual(["Unarmed Strike", "Ranged Attack"]);
  });

  it("інлайн-зброя без назви не бере назву базового удару", () => {
    const withInline = { campaignId: "c", inventory: { equipped: { weapon: { damageDice: "1d8" } } } } as unknown as CharacterFromPrisma;

    const attacks = extractAttacksFromCharacter(withInline, {}, { meleeName: "Кулак", rangedName: "Камінь", weaponName: "Зброя" });

    expect(attacks[0].name).toBe("Зброя");
  });
});
