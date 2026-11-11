import type { Spell } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { EffectSchema } from "@/lib/utils/abilities/schema";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const map: BattleMapConfig = { cols: 20, rows: 10, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, x: number, y: number): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position: { x, y } } });

const phantom = {
  id: "phantom", campaignId: "c1", name: "Фантом", level: 1, groupId: null, icon: null, dice: 0, cost: "action",
  targeting: { kind: "ally" }, resolution: { kind: "auto" }, raceModifiers: [], spellEffects: [{ kind: "phantom" }],
} as unknown as Spell;

const wizard = (): BattleParticipant => {
  const base = at(participant("wiz", { controlledBy: "user-1", name: "Маг" }), 0, 5);

  return { ...base, spellcasting: { spellSlots: { "1": { max: 4, current: 4 } }, knownSpells: ["phantom"], spellSaveDC: 13, spellAttackBonus: 5 } };
};

const knight = (): BattleParticipant => {
  const base = at(participant("knight", { controlledBy: "user-2", name: "Лицар", sourceType: ParticipantSourceType.CHARACTER, sourceId: "char-knight" }), 2, 5);

  return {
    ...base,
    abilities: { ...base.abilities, strength: 18, level: 7 },
    combatStats: { ...base.combatStats, maxHp: 60, currentHp: 41, armorClass: 18, speed: 25 },
    battleData: { ...base.battleData, attacks: [{ id: "sword", name: "Меч", type: "melee", attackBonus: 8, damageDice: "1d10", damageType: "slashing" } as never] },
  };
};

const run = (ps: BattleParticipant[], targetId: string, userId = "user-1") => {
  const fresh = ps.map((p) => (p.basicInfo.id === "wiz" ? { ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } } : p));

  const ctx = context({ participants: fresh, rng: () => 0.5, isDM: false, userId });

  ctx.meta = { ...ctx.meta, map };

  return createSpellMutation({ loadSpell: async () => phantom, loadPool: async () => ({ units: [], races: [] }) })(ctx, { casterId: "wiz", spellId: "phantom", targetIds: [targetId], diceRolls: [] } as never);
};

const clones = (ps: BattleParticipant[]) => ps.filter((p) => p.battleData.phantomOf === "wiz");

const alive = (ps: BattleParticipant[]) => clones(ps).filter((p) => p.combatStats.status === CombatStatus.ACTIVE);

describe("phantom spell effect", () => {
  it("schema accepts the bare effect", () => {
    expect(EffectSchema.safeParse({ kind: "phantom" }).success).toBe(true);
  });

  it("creates a full copy of the target with 1 HP, controlled by the caster", async () => {
    const out = await run([wizard(), knight(), goblin], "knight");

    const [c] = alive(out.participants);

    expect(c).toBeDefined();
    expect(c.combatStats).toMatchObject({ currentHp: 1, maxHp: 1, armorClass: 18, speed: 25 });
    expect(c.abilities.strength).toBe(18);
    expect(c.battleData.attacks.map((a) => a.name)).toEqual(["Меч"]);
    expect(c.battleData.activeEffects).toEqual([]);
    expect(c.basicInfo).toMatchObject({ side: ParticipantSide.ALLY, controlledBy: "user-1", name: "Лицар" });
    expect(c.basicInfo.id).not.toBe("knight");
    expect(c.basicInfo.sourceType).toBe(ParticipantSourceType.UNIT);
    expect(c.battleData.summonedBy).toBe("wiz");
    expect(c.battleData.position).toBeDefined();
    expect(out.participants.find((p) => p.basicInfo.id === "knight")?.combatStats.currentHp).toBe(41);
  });

  it("a second cast replaces the first phantom", async () => {
    const first = await run([wizard(), knight(), goblin], "knight");

    const second = await run(first.participants, "wiz");

    expect(clones(second.participants)).toHaveLength(2);
    expect(alive(second.participants)).toHaveLength(1);
    expect(alive(second.participants)[0].abilities.strength).toBe(wizard().abilities.strength);
  });

  it("a dead phantom is not alive and the next cast leaves a single live one", async () => {
    const first = await run([wizard(), knight(), goblin], "knight");

    const killed = first.participants.map((p) => (p.battleData.phantomOf ? { ...p, combatStats: { ...p.combatStats, currentHp: 0, status: CombatStatus.DEAD } } : p));

    expect(alive(killed)).toHaveLength(0);

    const again = await run(killed, "knight");

    expect(alive(again.participants)).toHaveLength(1);
  });

  it("another caster's phantom is left alone", async () => {
    const first = await run([wizard(), knight(), goblin], "knight");

    const other = first.participants.map((p) => (p.battleData.phantomOf ? { ...p, battleData: { ...p.battleData, phantomOf: "someone-else" } } : p));

    const second = await run(other, "knight");

    expect(other.filter((p) => p.battleData.phantomOf === "someone-else" && p.combatStats.status === CombatStatus.ACTIVE)).toHaveLength(1);
    expect(second.participants.filter((p) => p.battleData.phantomOf === "someone-else" && p.combatStats.status === CombatStatus.ACTIVE)).toHaveLength(1);
    expect(alive(second.participants)).toHaveLength(1);
  });
});
