import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { patchParticipantMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/patch-participant-mutation";
import { CombatStatus } from "@/lib/constants/battle";
import { beginConcentration } from "@/lib/utils/battle/concentration";
import { hasCondition } from "@/lib/utils/battle/conditions";
import { startDying } from "@/lib/utils/battle/death-saves";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const rules: Ruleset = { ...DEFAULT_RULES, deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true }, concentration: { enabled: true, dcCap: null } };

const ctx = (participants = [hero, goblin]) => context({ participants, meta: { ...context().meta, rules } });

const heroOf = (out: ReturnType<typeof patchParticipantMutation>) => out.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant;

describe("DM-правки HP з правилами 5e", () => {
  it("лікування героя, що вмирає, знімає кидки смерті й непритомність", () => {
    const down = startDying({ ...hero, combatStats: { ...hero.combatStats, currentHp: 0 } }, rules);

    const out = patchParticipantMutation(ctx([down, goblin]), "hero", { currentHp: 6 });

    expect(heroOf(out).combatStats.status).toBe(CombatStatus.ACTIVE);
    expect(heroOf(out).battleData.deathSaves).toBeUndefined();
    expect(hasCondition(heroOf(out), "unconscious")).toBe(false);
  });

  it("воскресіння так само чистить кидки смерті", () => {
    const dead = { ...startDying({ ...hero, combatStats: { ...hero.combatStats, currentHp: 0 } }, rules), combatStats: { ...hero.combatStats, currentHp: 0, status: CombatStatus.DEAD } };

    const out = patchParticipantMutation(ctx([dead, goblin]), "hero", { revive: true });

    expect(heroOf(out).battleData.deathSaves).toBeUndefined();
    expect(hasCondition(heroOf(out), "unconscious")).toBe(false);
  });

  it("HP героя до 0 запускає кидки смерті", () => {
    const out = patchParticipantMutation(ctx(), "hero", { currentHp: 0 });

    expect(heroOf(out).battleData.deathSaves).toEqual({ successes: 0, failures: 0, stable: false });
    expect(hasCondition(heroOf(out), "unconscious")).toBe(true);
  });

  it("вбивство знімає концентрацію", () => {
    const [c] = beginConcentration([hero], "hero", "hero:sp@1#0", "Щит", 3).participants;

    const out = patchParticipantMutation(ctx([c, goblin]), "hero", { kill: true });

    expect(heroOf(out).combatStats.status).toBe(CombatStatus.DEAD);
    expect(heroOf(out).battleData.activeEffects.some((e) => e.concentration)).toBe(false);
  });

  it("DM опускає концентратора до 0 HP — концентрація зникає", () => {
    const [c] = beginConcentration([hero], "hero", "hero:sp@1#0", "Щит", 3).participants;

    const out = patchParticipantMutation(ctx([c, goblin]), "hero", { currentHp: 0 });

    expect(heroOf(out).combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(heroOf(out).battleData.activeEffects.some((e) => e.concentration)).toBe(false);
  });
});
