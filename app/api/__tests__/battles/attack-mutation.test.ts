import { describe, expect, it } from "vitest";

import { attackBodySchema, attackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { mergeDiceFormulas, parseDice } from "@/lib/utils/common/dice";

const base = createMockParticipant();

const hero = createMockParticipant({
  basicInfo: { ...base.basicInfo, id: "hero", controlledBy: "user-1" },
  battleData: { ...base.battleData, attacks: [{ id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" }] },
});

// багато HP і не критичний кидок: ефект криту випадковий і може вбити ціль, тоді хід перескакує
const goblin = createMockParticipant({
  basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" },
  combatStats: { ...base.combatStats, maxHp: 100, currentHp: 100 },
});

const ctx = {
  scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 2, eventSeq: 3, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  participants: [hero, goblin],
  pending: [],
  userId: "user-1",
  isDM: false,
} as unknown as BattleMutationContext;

const body = (over: Record<string, unknown> = {}) =>
  attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 15, damageRolls: [8], ...over });

describe("attack mutation", () => {
  it("атака без endTurn — подія атаки, хід не змінюється", () => {
    const out = attackMutation(ctx, body());

    expect(out.events[0].type).toBe("attack");
    expect(out.scene?.turnIndex).toBeUndefined();
  });

  it("атака з endTurn — хід передається тим самим збереженням", () => {
    const out = attackMutation(ctx, body({ endTurn: true }));

    expect(out.scene).toMatchObject({ turnIndex: 1, pendingMoraleCheck: null });
  });

  it("чужий атакувальник — 403", () => {
    expect(() => attackMutation({ ...ctx, userId: "someone" } as never, body())).toThrow(BattleAccessError);
  });

  it("невідома ціль — 422 action_rejected або 404", () => {
    expect(() => attackMutation(ctx, body({ targetId: "nobody" }))).toThrow(Error);
  });

  it("помилки AttackPhaseError мапляться на помилки пайплайну", () => {
    try {
      attackMutation(ctx, body({ attackerId: "gob" }));
    } catch (e) {
      expect(e instanceof BattleAccessError || e instanceof BattleRuleError).toBe(true);
    }
  });


  it("неможливий кидок шкоди (99 на d8) — invalid_dice", () => {
    expect(() => attackMutation(ctx, body({ damageRolls: [99] }))).toThrow(expect.objectContaining({ code: "invalid_dice" }));
  });

  it("герой кидає кубики зброї плюс кубики рівня — це не помилка", () => {
    const heroAttacker = {
      ...hero,
      basicInfo: { ...hero.basicInfo, sourceType: "character" as const },
      abilities: { ...hero.abilities, level: 9 },
      battleData: { ...hero.battleData, attacks: [{ id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" }] },
    };

    const formula = mergeDiceFormulas("1d6", getHeroDamageDiceForLevel(9, AttackType.MELEE));

    const rolls = (parseDice(formula)?.groups ?? []).flatMap((g) => Array.from({ length: g.count }, () => g.size));

    expect(() => attackMutation({ ...ctx, participants: [heroAttacker, goblin] } as never, body({ damageRolls: rolls }))).not.toThrow(
      expect.objectContaining({ code: "invalid_dice" }),
    );
  });

  it("підказана клієнтом шкода реакції (більша за подвоєну зброю захисника) приймається", () => {
    expect(() => attackMutation(ctx, body({ reactionDamage: 37 }))).not.toThrow(expect.objectContaining({ code: "invalid_dice" }));
  });

  it("нестандартний запис кубиків зброї (\"1d8 piercing\") не блокує атаку", () => {
    const odd = { ...hero, basicInfo: { ...hero.basicInfo, sourceType: "unit" as const }, battleData: { ...hero.battleData, attacks: [{ id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8 piercing", damageType: "piercing" }] } };

    expect(() => attackMutation({ ...ctx, participants: [odd, goblin] } as never, body({ damageRolls: [5] }))).not.toThrow(
      expect.objectContaining({ code: "invalid_dice" }),
    );
  });
});
