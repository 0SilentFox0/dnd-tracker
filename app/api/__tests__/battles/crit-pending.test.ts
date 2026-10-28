import type { Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { context, goblin as baseGoblin, participant } from "./fixtures";

import { attackBodySchema, createAttackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { createSpellMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { AttackType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";

const base = createMockParticipant();

const hero = participant(
  "hero",
  { controlledBy: "user-1" },
  {
    battleData: { ...base.battleData, attacks: [{ id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" }] },
    spellcasting: { spellSlots: { "1": { max: 2, current: 2 } }, knownSpells: ["s1"] },
  },
);

const goblin = { ...baseGoblin, combatStats: { ...baseGoblin.combatStats, maxHp: 100, currentHp: 100 } };

const attack = createAttackMutation({ loadPool: async () => ({ units: [], races: [] }), loadSpells: async () => [] });

const spell = createSpellMutation({
  loadPool: async () => ({ units: [], races: [] }),
  loadSpell: vi.fn(async () => ({
    id: "s1", campaignId: "c1", name: "Стріла", level: 1, groupId: null, icon: null, dice: 1, cost: "action", targeting: { kind: "enemy" },
    resolution: { kind: "save", ability: "dexterity", onSuccess: "half" },
    spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [],
  }) as unknown as Spell),
});

const on = (over: Partial<BattleMutationContext> = {}) => {
  const c = context({ participants: [hero, goblin], ...over });

  return { ...c, meta: { ...c.meta, critChoiceByDm: true } };
};

const body = (over: Record<string, unknown> = {}) => attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 20, damageRolls: [4], ...over });

const hpOf = (out: { participants: { basicInfo: { id: string }; combatStats: { currentHp: number } }[] }) => out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp;

describe("атака: вибір крита ДМ-ом", () => {
  it("прапор off + нат. 20: дія застосована, pending немає", async () => {
    const c = on();

    const out = await attack({ ...c, meta: { ...c.meta, critChoiceByDm: false } }, body());

    expect(out.events).toHaveLength(1);
    expect(out.scene?.pendingCritChoice).toBeUndefined();
  });

  it("прапор on + тригер: учасники без змін, подій немає, pending має seed і request", async () => {
    const c = on();

    const out = await attack(c, body());

    expect(out.participants).toBe(c.participants);
    expect(out.events).toEqual([]);
    expect(out.response).toEqual({ pendingCritChoice: true });
    expect(out.scene?.pendingCritChoice).toMatchObject({
      action: "attack",
      actorId: "hero",
      seed: expect.any(Number),
      request: expect.objectContaining({ attackerId: "hero" }),
      triggers: [expect.objectContaining({ source: "attack", kind: "success", key: "attack:hero:gob:0" })],
    });
  });

  it("прапор on без крита: звичайний результат", async () => {
    const out = await attack(on(), body({ d20Roll: 12 }));

    expect(out.events).toHaveLength(1);
    expect(out.scene?.pendingCritChoice).toBeUndefined();
  });

  it("resume з порожнім вибором однаковий за seed і очищає pending", async () => {
    const pending = (await attack(on(), body())).scene?.pendingCritChoice as { seed: number };

    const resume = { seed: pending.seed, choices: {} };

    const a = await attack(on(), body(), resume);

    const b = await attack(on(), body(), resume);

    expect(a.scene?.pendingCritChoice).toBeNull();
    expect(a.events).toHaveLength(1);
    expect(hpOf(a)).toBe(hpOf(b));
    expect(a.events[0].resultText).toBe(b.events[0].resultText);
  });

  it("схема відкидає critChoices/seed з тіла — pending не обійти", async () => {
    const parsed = body({ critChoices: { "attack:hero:gob:0": 1 }, seed: 5 });

    expect(parsed).not.toHaveProperty("critChoices");
    expect(parsed).not.toHaveProperty("seed");

    expect((await attack(on(), parsed)).scene?.pendingCritChoice).toBeTruthy();
  });
});

describe("заклинання: вибір крита ДМ-ом", () => {
  const dm = () => on({ isDM: true, userId: "dm" });

  const data = (over: Record<string, unknown> = {}) => ({ casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [4], saveRolls: [{ participantId: "gob", roll: 20 }], ...over });

  it("крит рятунку при увімкненому прапорі створює pending", async () => {
    const out = await spell(dm(), data() as never);

    expect(out.events).toEqual([]);
    expect(out.scene?.pendingCritChoice).toMatchObject({ action: "spell", triggers: [expect.objectContaining({ source: "save" })] });
  });

  it("preview pending не створює", async () => {
    const out = await spell(dm(), data({ preview: true, diceRolls: [] }) as never);

    expect(out.scene?.pendingCritChoice).toBeUndefined();
    expect(out.response).toMatchObject({ preview: true });
  });

  it("прапор off: заклинання застосоване", async () => {
    const c = dm();

    const out = await spell({ ...c, meta: { ...c.meta, critChoiceByDm: false } }, data() as never);

    expect(out.events).toHaveLength(1);
    expect(out.scene?.pendingCritChoice).toBeUndefined();
  });
});

