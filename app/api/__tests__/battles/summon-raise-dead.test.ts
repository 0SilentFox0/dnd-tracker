import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { createAbilityActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/ability-action/ability-action-mutation";
import { createBonusActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { ParticipantSide, ParticipantSourceType, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { assertAccess, BattleAccess } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { joinParticipant, splitParticipant } from "@/lib/utils/battle/store/split-participant";
import type { SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import type { BattleParticipant } from "@/types/battle";

const unit = (id: string, name: string, level: number, raceId: string) =>
  ({
    id, campaignId: "c1", name, raceId, level, strength: 14, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
    armorClass: 13, initiative: 2, speed: 30, maxHp: 40, proficiencyBonus: 2, attacks: [{ name: "Кіготь", type: "melee", attackBonus: 4, damageDice: "1d6", damageType: "slashing" }],
    knownSpells: [], avatar: null, createdAt: new Date(), immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [],
  }) as unknown as UnitFromPrisma;

const deps: SummonDeps = {
  loadPool: async () => ({
    units: [unit("u-imp", "Біс", 5, "r-demon"), unit("u-rat", "Щур", 1, "r-beast")],
    races: [{ id: "r-demon", campaignId: "c1", name: "Демони", abilities: [] }, { id: "r-beast", campaignId: "c1", name: "Звірі", abilities: [] }] as unknown as Prisma.RaceGetPayload<object>[],
  }),
};

const gate = resolved({ id: "gate", name: "Відкриття воріт", trigger: { event: "bonusAction" }, limits: { perBattle: 1 }, effects: [{ kind: "summon", group: "Демони", tier: 5 }] });

const missing = resolved({ id: "none", name: "Поклик", trigger: { event: "bonusAction" }, effects: [{ kind: "summon", group: "Демони", tier: 7 }] });

const legion = resolved({ id: "legion", name: "Легіон", trigger: { event: "bonusAction" }, effects: [{ kind: "summon", group: "дЕмОни", tier: 5, count: 2 }] });

const byUnit = resolved({ id: "byUnit", name: "Поклик звіра", trigger: { event: "bonusAction" }, effects: [{ kind: "summon", unitId: "u-rat" }] });

const gone = resolved({ id: "gone", name: "Поклик нікого", trigger: { event: "bonusAction" }, effects: [{ kind: "summon", unitId: "u-missing" }] });

const raise = resolved({
  id: "raise",
  name: "Підняття мертвих",
  trigger: { event: "action" },
  condition: { type: "targetDead" },
  limits: { perBattle: 1 },
  maxTargets: 2,
  effects: [{ kind: "raiseDead", hpPercent: 90, target: "eventTarget" }],
});

const base = participant("hero", { controlledBy: "user-1" }, {});

const caster: BattleParticipant = { ...base, battleData: { ...base.battleData, resolvedAbilities: [gate, missing, legion, byUnit, gone, raise] } };

const dead = (id: string, sourceType: ParticipantSourceTypeValue = ParticipantSourceType.UNIT): BattleParticipant => {
  const p = participant(id, { side: ParticipantSide.ENEMY, controlledBy: "dm", sourceType }, {});

  return { ...p, actionFlags: { ...p.actionFlags, hasUsedAction: true }, combatStats: { ...p.combatStats, currentHp: 0, maxHp: 50, status: "dead" } } as BattleParticipant;
};

const bonus = createBonusActionMutation(deps);

const action = createAbilityActionMutation(deps);

const find = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

describe("summon", () => {
  it("adds a demon on the owner's side with summonedBy and it survives a save/reload round trip", async () => {
    const out = await bonus(context({ participants: [caster, goblin] }), { participantId: "hero", abilityKey: gate.key });

    const added = out.participants.find((p) => p.basicInfo.sourceId === "u-imp") as BattleParticipant;

    expect(out.participants).toHaveLength(3);
    expect(added.basicInfo.side).toBe(caster.basicInfo.side);
    expect(added.battleData.summonedBy).toBe("hero");
    expect(out.events[0].resultText).toContain("прикликано");

    const restored = joinParticipant(splitParticipant(added, { orderIndex: 2, isPending: false }), added.basicInfo.battleId);

    expect(restored.battleData.summonedBy).toBe("hero");
    expect(restored.basicInfo.side).toBe(added.basicInfo.side);
  });

  it("count 2 adds two numbered instances; group match ignores case", async () => {
    const out = await bonus(context({ participants: [caster, goblin] }), { participantId: "hero", abilityKey: legion.key });

    const imps = out.participants.filter((p) => p.basicInfo.sourceId === "u-imp");

    expect(imps.map((p) => p.basicInfo.name)).toEqual(["Біс #1", "Біс #2"]);
  });

  it("summon by unitId ignores group and tier", async () => {
    const out = await bonus(context({ participants: [caster, goblin] }), { participantId: "hero", abilityKey: byUnit.key });

    const added = out.participants.find((p) => p.basicInfo.sourceId === "u-rat") as BattleParticipant;

    expect(added.battleData.summonedBy).toBe("hero");
    expect(added.basicInfo.side).toBe(caster.basicInfo.side);
  });

  it("unknown unitId: a message and nothing added", async () => {
    const out = await bonus(context({ participants: [caster, goblin] }), { participantId: "hero", abilityKey: gone.key });

    expect(out.participants).toHaveLength(2);
    expect(out.events[0].resultText).toContain("обраного юніта не знайдено");
  });

  it("no matching unit: a message and nothing added", async () => {
    const out = await bonus(context({ participants: [caster, goblin] }), { participantId: "hero", abilityKey: missing.key });

    expect(out.participants).toHaveLength(2);
    expect(out.events[0].resultText).toContain("немає юніта групи Демони Tier 7");
  });
});

describe("raiseDead", () => {
  it("flips two dead enemy units to the caster's side at 90 %", async () => {
    const out = await action(context({ participants: [caster, dead("d1"), dead("d2")] }), { participantId: "hero", abilityKey: raise.key, targetParticipantIds: ["d1", "d2"] });

    for (const id of ["d1", "d2"]) {
      const p = find(out.participants, id);

      expect(p.basicInfo.side).toBe(caster.basicInfo.side);
      expect(p.combatStats).toMatchObject({ status: "active", currentHp: 45 });
      expect(p.battleData.summonedBy).toBe("hero");
      expect(p.actionFlags.hasUsedAction).toBe(false);
    }
  });

  it("rejects a dead hero before anything is consumed, plus a third target", async () => {
    const ps = [caster, dead("h1", ParticipantSourceType.CHARACTER)];

    await expect(action(context({ participants: ps }), { participantId: "hero", abilityKey: raise.key, targetParticipantIds: ["h1"] })).rejects.toThrow(expect.objectContaining({ code: "invalid_target" }));
    expect(caster.actionFlags.hasUsedAction).toBe(false);
    expect(caster.battleData.abilityUsage?.[raise.key]).toBeUndefined();
    await expect(action(context({ participants: [caster, dead("d1"), dead("d2"), dead("d3")] }), { participantId: "hero", abilityKey: raise.key, targetParticipantIds: ["d1", "d2", "d3"] })).rejects.toThrow(
      expect.objectContaining({ code: "invalid_target" }),
    );
  });

  it("raiseDead implies a dead target even without a targetDead condition", async () => {
    const bare = resolved({ id: "bare", trigger: { event: "action" }, effects: [{ kind: "raiseDead", hpPercent: 50, target: "eventTarget" }] });

    const c = { ...caster, battleData: { ...caster.battleData, resolvedAbilities: [bare] } };

    await expect(action(context({ participants: [c, goblin] }), { participantId: "hero", abilityKey: bare.key, targetParticipantIds: ["gob"] })).rejects.toThrow(expect.objectContaining({ code: "invalid_target" }));
  });

  it("a reviving heal only accepts fallen allies of the owner's side", async () => {
    const angel = resolved({ id: "angel", trigger: { event: "action" }, condition: { type: "targetDead" }, effects: [{ kind: "heal", amount: 10, revive: true, target: "eventTarget" }] });

    const c = { ...caster, battleData: { ...caster.battleData, resolvedAbilities: [angel] } };

    await expect(action(context({ participants: [c, dead("d1")] }), { participantId: "hero", abilityKey: angel.key, targetParticipantIds: ["d1"] })).rejects.toThrow(expect.objectContaining({ code: "invalid_target" }));
  });
});

describe("summoned units are controlled by the summoner's player", () => {
  const playerCaster: BattleParticipant = { ...caster, basicInfo: { ...caster.basicInfo, controlledBy: "user-1" } };

  it("summon and raiseDead inherit controlledBy, so the player is the current controller", async () => {
    const summoned = await bonus(context({ participants: [playerCaster, goblin] }), { participantId: "hero", abilityKey: gate.key });

    const imp = summoned.participants.find((p) => p.basicInfo.sourceId === "u-imp") as BattleParticipant;

    expect(imp.basicInfo.controlledBy).toBe("user-1");

    const raised = await action(context({ participants: [playerCaster, dead("d1")] }), { participantId: "hero", abilityKey: raise.key, targetParticipantIds: ["d1"] });

    expect(find(raised.participants, "d1").basicInfo.controlledBy).toBe("user-1");

    const turn = context({ participants: [playerCaster, imp], userId: "user-1" });

    expect(() => assertAccess(BattleAccess.CURRENT_CONTROLLER, { ...turn, scene: { ...turn.scene, turnIndex: 1 } })).not.toThrow();
    expect(() => assertAccess(BattleAccess.CURRENT_CONTROLLER, { ...turn, userId: "someone", scene: { ...turn.scene, turnIndex: 1 } })).toThrow();
  });

  it("a DM-controlled summoner keeps DM control", async () => {
    const out = await bonus(context({ participants: [caster, goblin] }), { participantId: "hero", abilityKey: gate.key });

    expect((out.participants.find((p) => p.basicInfo.sourceId === "u-imp") as BattleParticipant).basicInfo.controlledBy).toBe(caster.basicInfo.controlledBy);
  });
});
