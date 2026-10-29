import { describe, expect, it } from "vitest";

import { CombatStatus, type CombatStatusType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { autoXpEnabled, battleXpAward } from "@/lib/utils/battle/turn/battle-xp";
import { originalSide } from "@/lib/utils/battle/turn/original-side";
import { completeBattle } from "@/lib/utils/battle/turn/victory";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const p = (id: string, info: Partial<BattleParticipant["basicInfo"]>, status: CombatStatusType = CombatStatus.ACTIVE, data: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => {
  const b = createMockParticipant();

  return { ...b, basicInfo: { ...b.basicInfo, id, ...info }, combatStats: { ...b.combatStats, status }, battleData: { ...b.battleData, ...data } };
};

const hero = (id: string, sourceId: string, extra: Partial<BattleParticipant["basicInfo"]> = {}) => p(id, { sourceId, sourceType: "character", side: ParticipantSide.ALLY, ...extra });

const foe = (id: string, xp: number, status: CombatStatusType = CombatStatus.DEAD, data: Partial<BattleParticipant["battleData"]> = {}) => p(id, { sourceId: id, sourceType: "unit", side: ParticipantSide.ENEMY, xp }, status, data);

const ON: Ruleset = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, xp: true }, encounters: { ...DEFAULT_RULES.encounters, autoXp: true } };

describe("battleXpAward", () => {
  it("лише переможені оригінальні вороги; призвані, живі й слоти ходу — ні; герої — по разу", () => {
    const charmed = foe("charmed", 200, CombatStatus.UNCONSCIOUS, { charmReturn: { side: ParticipantSide.ENEMY, controlledBy: "dm" } });

    const ps = [
      hero("h1", "ch-1"),
      hero("h1-x", "ch-1", { isExtraTurnSlot: true }),
      hero("h2", "ch-2"),
      { ...charmed, basicInfo: { ...charmed.basicInfo, side: ParticipantSide.ALLY } },
      foe("ogre", 450),
      foe("ogre-x", 450, CombatStatus.DEAD),
      foe("alive", 1000, CombatStatus.ACTIVE),
      foe("imp", 50, CombatStatus.DEAD, { summonedBy: "ogre" }),
      p("npc", { sourceId: "npc", sourceType: "character", side: ParticipantSide.ENEMY }, CombatStatus.DEAD),
    ];

    ps[5] = { ...ps[5], basicInfo: { ...ps[5].basicInfo, isExtraTurnSlot: true } };

    expect(originalSide(ps[3])).toBe(ParticipantSide.ENEMY);
    expect(battleXpAward(ps)).toEqual({ total: 650, share: 325, characterIds: ["ch-1", "ch-2"] });
  });

  it("немає XP або героїв — null", () => {
    expect(battleXpAward([hero("h1", "ch-1"), foe("homm", 0)])).toBeNull();
    expect(battleXpAward([foe("ogre", 450)])).toBeNull();
  });

  it("autoXpEnabled потребує обох правил", () => {
    expect(autoXpEnabled(ON)).toBe(true);
    expect(autoXpEnabled({ ...ON, outOfCombat: DEFAULT_RULES.outOfCombat })).toBe(false);
    expect(autoXpEnabled(DEFAULT_RULES)).toBe(false);
    expect(autoXpEnabled(undefined)).toBe(false);
  });
});

describe("completeBattle: рядок досвіду в лозі", () => {
  const ps = () => [hero("h1", "ch-1"), hero("h2", "ch-2"), foe("ogre", 450)];

  it("перемога з авто-досвідом", () => {
    expect(eventTextOf(completeBattle(ps(), "victory", 3, ON).battleAction)).toBe("🎉 Бій завершено! Перемога союзників! · ⭐ Досвід: 225 кожному");
  });

  it("поразка або вимкнене правило — як раніше", () => {
    expect(eventTextOf(completeBattle(ps(), "defeat", 3, ON).battleAction)).toBe("💀 Бій завершено! Поразка союзників!");
    expect(eventTextOf(completeBattle(ps(), "victory", 3, DEFAULT_RULES).battleAction)).toBe("🎉 Бій завершено! Перемога союзників!");
  });
});
