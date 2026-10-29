import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { dive, fireBurst } from "@/data/library/unit-abilities";
import { ParticipantSide } from "@/lib/constants/battle";
import { abilityActionMutation } from "@/lib/server/battles/mutations/ability-action/ability-action-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { REJECT } from "@/lib/utils/battle/store/reject";
import type { BattleParticipant } from "@/types/battle";

const angel = resolved({
  id: "ang",
  name: "Ангел Хранитель",
  trigger: { event: "action" },
  condition: { type: "targetDead" },
  limits: { perBattle: 1 },
  effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 50 }, revive: true, target: "eventTarget" }],
});

const strike = resolved({ id: "st", name: "Удар", trigger: { event: "action" }, limits: { perBattle: 1 }, effects: [{ kind: "changeMorale", delta: 1 }] });

const base = participant("hero", { controlledBy: "user-1" }, {});

const hero: BattleParticipant = { ...base, battleData: { ...base.battleData, resolvedAbilities: [angel, strike] } };

const fallen = (): BattleParticipant => {
  const p = participant("ally", { side: ParticipantSide.ALLY, controlledBy: "user-2" }, {});

  return { ...p, combatStats: { ...p.combatStats, currentHp: 0, maxHp: 40, status: "dead" } } as BattleParticipant;
};

const run = (ps: BattleParticipant[], abilityKey: string, targetParticipantIds?: string[]) =>
  abilityActionMutation(context({ participants: ps }), { participantId: "hero", abilityKey, targetParticipantIds });

const find = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

describe("abilityActionMutation", () => {
  it("consumes the main action and records the use", async () => {
    const h = find((await run([hero, goblin], strike.key)).participants, "hero");

    expect(h.actionFlags.hasUsedAction).toBe(true);
    expect(h.combatStats.morale).toBe(1);
    expect(h.battleData.abilityUsage?.[strike.key].battle).toBe(1);
  });

  it("an action ability that grants +1 action leaves exactly one more action", async () => {
    const surge = resolved({ id: "su", name: "Порив", trigger: { event: "action" }, effects: [{ kind: "grantAction", extraActions: 1, target: "self" }] });

    const h = find((await run([{ ...hero, battleData: { ...hero.battleData, resolvedAbilities: [surge] } }, goblin], surge.key)).participants, "hero");

    expect(h.actionFlags.hasUsedAction).toBe(false);
    expect(h.battleData.pendingExtraActions ?? 0).toBe(0);
  });

  it("second action in the same turn is rejected", async () => {
    const used = { ...hero, actionFlags: { ...hero.actionFlags, hasUsedAction: true } };

    await expect(run([used, goblin], strike.key)).rejects.toThrow(expect.objectContaining({ code: "action_used" }));
  });

  it("respects the perBattle limit", async () => {
    const spent = { ...hero, battleData: { ...hero.battleData, abilityUsage: { [strike.key]: { battle: 1, round: 1, turn: 1 } } } };

    await expect(run([spent, goblin], strike.key)).rejects.toThrow(expect.objectContaining({ code: "ability_limit" }));
  });

  it("a cooling-down ability reports the rounds left, not an exhausted limit", async () => {
    const slow = resolved({ id: "cd", name: "Ривок", trigger: { event: "action" }, limits: { cooldownRounds: 2 }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const cooling = { ...hero, battleData: { ...hero.battleData, resolvedAbilities: [slow], abilityUsage: { [slow.key]: { battle: 1, round: 0, turn: 0, lastRound: 1 } } } };

    await expect(run([cooling, goblin], slow.key)).rejects.toThrow(expect.objectContaining({ code: "ability_limit", message: expect.stringContaining(REJECT.abilityCooldown) }));
  });

  it("Ангел Хранитель revives a fallen ally at 50 %, a living target is rejected", async () => {
    const out = await run([hero, fallen()], angel.key, ["ally"]);

    expect(find(out.participants, "ally").combatStats).toMatchObject({ currentHp: 20, status: "active" });
    expect(find(out.participants, "hero").actionFlags.hasUsedAction).toBe(true);
    await expect(run([hero, goblin], angel.key, ["gob"])).rejects.toThrow(expect.objectContaining({ code: "invalid_target" }));
  });

  it("bonus-action abilities are not usable as the main action", async () => {
    const bonus = resolved({ id: "b", trigger: { event: "bonusAction" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const h = { ...hero, battleData: { ...hero.battleData, resolvedAbilities: [bonus] } };

    await expect(run([h, goblin], bonus.key)).rejects.toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("uses up the extra-action pool instead of the main action", async () => {
    const pooled = { ...hero, battleData: { ...hero.battleData, pendingExtraActions: 1 } };

    const h = find((await run([pooled, goblin], strike.key)).participants, "hero");

    expect(h.battleData.pendingExtraActions).toBe(0);
    expect(h.actionFlags.hasUsedAction).toBe(false);
  });

  it("panicking participant is rejected, non-controller gets 403", async () => {
    const panic = { participantId: "hero", d10Roll: 1, moraleResult: { shouldSkipTurn: true, hasExtraTurn: false, moralePositive: false, message: "" } };

    const ctx = context({ participants: [hero, goblin] });

    const body = { participantId: "hero", abilityKey: strike.key };

    await expect(abilityActionMutation({ ...ctx, scene: { ...ctx.scene, pendingMoraleCheck: panic } }, body)).rejects.toThrow(expect.objectContaining({ code: "action_used" }));
    await expect(abilityActionMutation(context({ participants: [hero, goblin], userId: "someone" }), body)).rejects.toThrow(expect.objectContaining({ status: 403 }));
  });

  it("власник не може діяти поза своїм ходом, DM — може", async () => {
    const body = { participantId: "hero", abilityKey: strike.key };

    const offTurn = context({ participants: [goblin, hero] });

    await expect(abilityActionMutation(offTurn, body)).rejects.toThrow(expect.objectContaining({ status: 403 }));
    await expect(abilityActionMutation({ ...offTurn, isDM: true }, body)).resolves.toBeDefined();
  });

  describe("маневри", () => {
    const map = testMap();

    const unit = (abilities: ReturnType<typeof resolved>[]): BattleParticipant => ({ ...hero, battleData: { ...hero.battleData, resolvedAbilities: abilities, position: { x: 1, y: 1 } } });

    const onMap = (ps: BattleParticipant[]) => {
      const ctx = context({ participants: ps });

      return { ...ctx, meta: { ...ctx.meta, map } };
    };

    it("вогняний вибух на карті не потребує цілі", async () => {
      const burst = resolved(fireBurst(), { type: "unit", id: "u" });

      const out = await abilityActionMutation(onMap([unit([burst]), goblin]), { participantId: "hero", abilityKey: burst.key });

      expect(find(out.participants, "hero").battleData.abilityUsage?.[burst.key].battle).toBe(1);
    });

    it("пікірування на карті — потрібна клітинка; без карти — ціль", async () => {
      const d = resolved(dive(), { type: "unit", id: "u" });

      await expect(abilityActionMutation(onMap([unit([d]), goblin]), { participantId: "hero", abilityKey: d.key })).rejects.toThrow(REJECT.pickCell);

      const out = await abilityActionMutation(onMap([unit([d]), goblin]), { participantId: "hero", abilityKey: d.key, targetCell: { x: 6, y: 6 } });

      expect(find(out.participants, "hero").battleData.airborne).toMatchObject({ landAt: { x: 6, y: 6 } });

      await expect(run([{ ...hero, battleData: { ...hero.battleData, resolvedAbilities: [d] } }, goblin], d.key)).rejects.toThrow();
    });
  });
});
