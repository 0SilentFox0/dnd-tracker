import { describe, expect, it, vi } from "vitest";

import { context, participant } from "./fixtures";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { CRITICAL_SUCCESS_EFFECTS } from "@/lib/constants/critical-effects";
import { attackBodySchema } from "@/lib/schemas/battles";
import { createAttackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { createCritChoiceMutation } from "@/lib/server/battles/mutations/crit-choice/crit-choice-mutation";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { mulberry32 } from "@/lib/utils/common/rng";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

const base = createMockParticipant();

const strong = (p: BattleParticipant): BattleParticipant => ({ ...p, combatStats: { ...p.combatStats, maxHp: 500, currentHp: 500 } });

const holder = strong(participant("h", { controlledBy: "user-1" }, {
  spellcasting: {
    spellSlots: {},
    knownSpells: [],
    spellAttackBonus: 30,
    grants: [{
      spellId: "nim", label: "Реакція", castCost: "reaction",
      inline: { targeting: { kind: "enemy", range: 60 }, resolution: { kind: "attack" }, dice: 2, dieSides: 8, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "lightning" }], anchorMarkId: "m", auto: { on: "attackAgainstMarked" } },
    }],
  },
}));

const ward = strong(participant("w", { controlledBy: "user-1" }, {
  battleData: {
    ...base.battleData,
    activeEffects: [{ id: "mark-m", name: "Мітка", type: "debuff", duration: 5, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], abilityKey: "mark:m", source: { participantId: "h" } } as never],
  },
}));

const foe = strong(participant("gob", { side: ParticipantSide.ENEMY, controlledBy: "dm", name: "Гоблін" }, {
  battleData: { ...base.battleData, attacks: [{ id: "claw", name: "Кіготь", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d4", damageType: "slashing" }] },
}));

const attack = createAttackMutation({ loadPool: async () => ({ units: [], races: [] }), loadSpells: async () => [] });

const critChoice = createCritChoiceMutation({ attack, spell: createSpellMutation({ loadPool: async () => ({ units: [], races: [] }), loadSpell: vi.fn() }) });

const body = attackBodySchema.parse({ attackerId: "gob", targetId: "w", attackId: "claw", d20Roll: 12, damageRolls: [2] });

const ctxOf = (flag: boolean, over: Partial<BattleMutationContext> = {}) => {
  const c = context({ participants: [foe, holder, ward], isDM: true, userId: "dm", ...over });

  return { ...c, meta: { ...c.meta, critChoiceByDm: flag } };
};

const text = (out: { events: { resultText?: string; details?: { log?: LogLine[] }; log?: LogLine[] }[] }) => out.events.map((e) => eventTextOf(e)).join("\n");

const foeHp = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp;

async function findSeed() {
  for (let seed = 1; seed <= 5000; seed++) {
    const out = await attack(ctxOf(false, { rng: mulberry32(seed) }), body);

    if (text(out).includes("атака заклинанням 20")) return seed;
  }

  throw new Error("seed not found");
}

describe("авто-реакція: крит атаки заклинанням", () => {
  it("пауза з тригером реакції, повтор із вибором дорівнює прогону з прапором off", async () => {
    const seed = await findSeed();

    vi.spyOn(Math, "random").mockReturnValue(seed / 2 ** 32);

    const pausedCtx = ctxOf(true, { rng: mulberry32(seed) });

    const paused = await attack(pausedCtx, body);

    vi.restoreAllMocks();

    const pending = paused.scene?.pendingCritChoice;

    expect(paused.response).toEqual({ pendingCritChoice: true });
    expect(pending).toMatchObject({ action: "attack", triggers: [expect.objectContaining({ source: "attack", kind: "success", key: "attack:h:gob:0" })] });
    expect(paused.participants).toBe(pausedCtx.participants);

    const resumed = await critChoice({ ...ctxOf(true), scene: { ...ctxOf(true).scene, pendingCritChoice: pending! } }, { choices: { "attack:h:gob:0": "random" } });

    const off = await attack(ctxOf(false, { rng: mulberry32(seed) }), body);

    expect(resumed.scene?.pendingCritChoice).toBeNull();
    expect(foeHp(resumed)).toBe(foeHp(off));

    const chosen = await critChoice({ ...ctxOf(true), scene: { ...ctxOf(true).scene, pendingCritChoice: pending! } }, { choices: { "attack:h:gob:0": CRITICAL_SUCCESS_EFFECTS.find((e) => e.effect.type === "double_damage")!.id } });

    expect(chosen.scene?.pendingCritChoice).toBeNull();
    expect(text(chosen)).toContain("атака заклинанням 20");
  });

  it("повтор з порожнім вибором дорівнює прогону з прапором off за тим самим seed", async () => {
    const seed = await findSeed();

    vi.spyOn(Math, "random").mockReturnValue(seed / 2 ** 32);

    const pending = (await attack(ctxOf(true, { rng: mulberry32(seed) }), body)).scene?.pendingCritChoice as { seed: number };

    vi.restoreAllMocks();

    const replay = await attack(ctxOf(true), body, { seed: pending.seed, choices: {} });

    const off = await attack(ctxOf(false, { rng: mulberry32(seed) }), body);

    expect(foeHp(replay)).toBe(foeHp(off));
    expect(text(replay)).toBe(text(off));
  });
});
