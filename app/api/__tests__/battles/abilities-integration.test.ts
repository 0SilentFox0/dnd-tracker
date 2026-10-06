import { describe, expect, it } from "vitest";

import { context, participant } from "./fixtures";

import { attackBodySchema, attackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { bonusActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { nextTurnMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { joinParticipant, splitParticipant } from "@/lib/utils/battle/store/split-participant";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

const sword = { id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" };

function withAbilities(p: BattleParticipant, abilities: ResolvedAbility[]): BattleParticipant {
  return { ...p, battleData: { ...p.battleData, resolvedAbilities: abilities } };
}

function makeHero(abilities: ResolvedAbility[] = []): BattleParticipant {
  const base = participant("hero", { controlledBy: "user-1", name: "Герой" });

  return withAbilities({ ...base, battleData: { ...base.battleData, attacks: [sword] } }, abilities);
}

function makeGoblin(id: string, hp: number, abilities: ResolvedAbility[] = []): BattleParticipant {
  const base = participant(id, { side: ParticipantSide.ENEMY, controlledBy: "dm", name: id });

  return withAbilities({ ...base, combatStats: { ...base.combatStats, maxHp: Math.max(hp, 20), currentHp: hp } }, abilities);
}

const attack = (ctx: BattleMutationContext, targetId = "gob") =>
  attackMutation(ctx, attackBodySchema.parse({ attackerId: "hero", targetId, attackId: "sword", d20Roll: 15, damageRolls: [8] }));

const find = (ps: BattleParticipant[], id: string) => {
  const p = ps.find((x) => x.basicInfo.id === id);

  if (!p) throw new Error(`${id} missing`);

  return p;
};

describe("abilities through mutations", () => {
  it("DOT на влучання тікає на початку ходу цілі", () => {
    const bleed = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: 3, damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] });

    const hit = attack(context({ participants: [makeHero([bleed]), makeGoblin("gob", 100)] }));

    const hpAfterHit = find(hit.participants, "gob").combatStats.currentHp;

    expect(find(hit.participants, "gob").battleData.activeEffects[0].dotDamage?.damagePerRound).toBe(3);

    const next = nextTurnMutation(context({ participants: hit.participants }));

    expect(find(next.participants, "gob").combatStats.currentHp).toBe(hpAfterHit - 3);
    expect(next.events.some((e) => e.resultText.includes("bleed"))).toBe(true);
  });

  it.skip("контратака цілі — один раз за раунд", () => {
    const counter = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 0 }] });

    const gob = { ...makeGoblin("gob", 100, [counter]), battleData: { ...makeGoblin("gob", 100, [counter]).battleData, attacks: [sword] } };

    const first = attack(context({ participants: [makeHero(), gob] }));

    const heroHp = find(first.participants, "hero").combatStats.currentHp;

    expect(heroHp).toBeLessThan(20);

    const refreshed = first.participants.map((p) => (p.basicInfo.id === "hero" ? { ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } } : p));

    const second = attack(context({ participants: refreshed }));

    expect(find(second.participants, "hero").combatStats.currentHp).toBe(heroHp);
  });

  it("виживання з 1 HP один раз за бій", () => {
    const survive = resolved({ trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: 1, revive: true }] });

    const first = attack(context({ participants: [makeHero(), makeGoblin("gob", 2, [survive])] }));

    expect(find(first.participants, "gob").combatStats).toMatchObject({ currentHp: 1, status: "active" });

    const refreshed = first.participants.map((p) => (p.basicInfo.id === "hero" ? { ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } } : p));

    const second = attack(context({ participants: refreshed }));

    expect(find(second.participants, "gob").combatStats.status).not.toBe("active");
  });

  it("смерть ворога знижує мораль його союзників рівно раз", () => {
    const mourn = resolved({ trigger: { event: "kill", role: "victimSide" }, effects: [{ kind: "changeMorale", delta: -1 }] });

    const out = attack(context({ participants: [makeHero(), makeGoblin("gob", 2), makeGoblin("gob2", 20, [mourn])] }));

    expect(find(out.participants, "gob2").combatStats.morale).toBe(-1);
  });

  it("бонусна дія з perTurn скидається на наступному ході власника", () => {
    const rally = resolved({ id: "r", trigger: { event: "bonusAction" }, limits: { perTurn: 1 }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const used = bonusActionMutation(context({ participants: [makeHero([rally]), makeGoblin("gob", 100)] }), { participantId: "hero", abilityKey: rally.key });

    expect(find(used.participants, "hero").battleData.abilityUsage?.[rally.key].turn).toBe(1);

    const toGoblin = nextTurnMutation(context({ participants: used.participants }));

    const ctxGoblinTurn = context({ participants: toGoblin.participants });

    const back = nextTurnMutation({ ...ctxGoblinTurn, scene: { ...ctxGoblinTurn.scene, turnIndex: 1 } });

    expect(find(back.participants, "hero").battleData.abilityUsage?.[rally.key].turn).toBe(0);
  });

  it("учасник зі старим snapshot (activeSkills) отримує бонус шкоди після апгрейду", () => {
    const plain = attack(context({ participants: [makeHero(), makeGoblin("gob", 100)] }));

    const stored = splitParticipant(makeHero(), { orderIndex: 0, isPending: false });

    const bd = stored.snapshot.battleData as Record<string, unknown>;

    delete bd.resolvedAbilities;
    delete bd.spellEnhancers;
    bd.activeSkills = [
      { skillId: "fury", name: "Лють", mainSkillId: "m", level: "basic", effects: [{ stat: "melee_damage", type: "percent", value: 50, isPercentage: true }], skillTriggers: [{ type: "simple", trigger: "passive" }] },
    ];

    const legacyHero = joinParticipant(stored, "b1");

    const boosted = attack(context({ participants: [legacyHero, makeGoblin("gob", 100)] }));

    expect(find(boosted.participants, "gob").combatStats.currentHp).toBeLessThan(find(plain.participants, "gob").combatStats.currentHp);
  });
});
