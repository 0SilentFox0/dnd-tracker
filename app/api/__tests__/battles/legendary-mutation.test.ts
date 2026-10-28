import { describe, expect, it } from "vitest";

import { context, hero, participant } from "./fixtures";

import { legendaryMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/core-action/legendary-mutation";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

const wing = resolved({ id: "wing", name: "Удар крилами", trigger: { event: "action" }, limits: { legendaryCost: 2 }, effects: [{ kind: "changeMorale", delta: 1 }] });

const plain = resolved({ id: "bite", name: "Укус", trigger: { event: "action" }, effects: [{ kind: "changeMorale", delta: 1 }] });

const dragonOf = (over: Partial<BattleParticipant["battleData"]> = {}, stats: Partial<BattleParticipant["combatStats"]> = {}): BattleParticipant => {
  const p = participant("dragon", { side: ParticipantSide.ENEMY, controlledBy: "dm", name: "Дракон", sourceType: "unit" });

  return {
    ...p,
    combatStats: { ...p.combatStats, ...stats },
    battleData: {
      ...p.battleData,
      attacks: [{ id: "tail", name: "Хвіст", type: AttackType.MELEE, attackBonus: 30, damageDice: "1d6", damageType: "bludgeoning" }],
      resolvedAbilities: [wing, plain],
      legendary: { actions: 3, actionsLeft: 3, resistLeft: 0 },
      ...over,
    },
  };
};

const dm = (dragon: BattleParticipant, turnIndex = 0) => context({ participants: [hero, dragon], isDM: true, userId: "dm", rng: () => 0.5, scene: { ...context().scene, turnIndex } });

const find = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

const attack = { action: "legendary" as const, participantId: "dragon", option: { kind: "attack" as const, attackIndex: 0, targetId: "hero" } };

const ability = (abilityKey: string) => ({ action: "legendary" as const, participantId: "dragon", option: { kind: "ability" as const, abilityKey } });

describe("legendary mutation", () => {
  it("атака поза ходом: −1 дія, подія легендарної дії й атаки; правила дій 5e не потрібні", async () => {
    const out = await legendaryMutation(dm(dragonOf()), attack);

    expect(find(out.participants, "dragon").battleData.legendary?.actionsLeft).toBe(2);
    expect(out.events).toHaveLength(2);
    expect(out.events[0].resultText).toBe("👑 Дракон: легендарна дія — Хвіст (2/3)");
    expect(find(out.participants, "hero").combatStats.currentHp).toBeLessThan(20);
  });

  it("вміння коштує legendaryCost і рахує використання", async () => {
    const out = await legendaryMutation(dm(dragonOf()), ability(wing.key));

    const d = find(out.participants, "dragon");

    expect(d.battleData.legendary?.actionsLeft).toBe(1);
    expect(d.combatStats.morale).toBe(1);
    expect(d.battleData.abilityUsage?.[wing.key].battle).toBe(1);
  });

  it("звичайне вміння легендарною дією не використовується", async () => {
    await expect(legendaryMutation(dm(dragonOf()), ability(plain.key))).rejects.toMatchObject({ message: "У учасника немає такої легендарної дії" });
  });

  it("свій хід, бюджет, мертвий, атака по союзнику — відмова без змін", async () => {
    await expect(legendaryMutation(dm(dragonOf(), 1), attack)).rejects.toMatchObject({ message: "Легендарна дія — лише поза своїм ходом" });
    await expect(legendaryMutation(dm(dragonOf({ legendary: { actions: 3, actionsLeft: 1, resistLeft: 0 } })), ability(wing.key))).rejects.toMatchObject({ message: "Не вистачає легендарних дій (1 з 2)" });
    await expect(legendaryMutation(dm(dragonOf({}, { currentHp: 0, status: "dead" })), attack)).rejects.toMatchObject({ message: "Недієздатний учасник не може діяти" });

    const ally = participant("imp", { side: ParticipantSide.ENEMY, controlledBy: "dm" });

    const ctx = context({ participants: [hero, dragonOf(), ally], isDM: true, userId: "dm", rng: () => 0.5 });

    await expect(legendaryMutation(ctx, { ...attack, option: { ...attack.option, targetId: "imp" } })).rejects.toMatchObject({ message: "Ціллю має бути живий ворог" });
  });

  it("гравець — 403", async () => {
    await expect(legendaryMutation(context({ participants: [hero, dragonOf()] }), attack)).rejects.toBeInstanceOf(BattleAccessError);
  });
});
