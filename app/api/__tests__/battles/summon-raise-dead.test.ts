import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { createAbilityActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/ability-action/ability-action-mutation";
import { createBonusActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { ParticipantSide, ParticipantSourceType, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
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

const caster: BattleParticipant = { ...base, battleData: { ...base.battleData, resolvedAbilities: [gate, missing, legion, raise] } };

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

  it("refuses a dead hero and a third target", async () => {
    const out = await action(context({ participants: [caster, dead("h1", ParticipantSourceType.CHARACTER)] }), { participantId: "hero", abilityKey: raise.key, targetParticipantIds: ["h1"] });

    expect(find(out.participants, "h1").combatStats.status).toBe("dead");
    expect(out.events[0].resultText).toContain("⛔");
    await expect(action(context({ participants: [caster, dead("d1"), dead("d2"), dead("d3")] }), { participantId: "hero", abilityKey: raise.key, targetParticipantIds: ["d1", "d2", "d3"] })).rejects.toThrow(
      expect.objectContaining({ code: "invalid_target" }),
    );
  });
});
