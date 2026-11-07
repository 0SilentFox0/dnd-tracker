import { describe, expect, it } from "vitest";

import { context } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const bow: BattleAttack = { id: "bow", name: "Bow", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d6", damageType: "piercing", wfrp: { qualities: [], flaws: [], ammoCapacity: 2, reload: 1 } };

const knife: BattleAttack = { id: "kn", name: "Knife", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d4", damageType: "slashing" };

const fighter = (id: string, side: ParticipantSide, battleData: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 20, maxHp: 20 });

  return { ...p, basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" }, battleData: { ...p.battleData, attacks: [bow, knife], ...battleData } };
};

const ctxOf = (archer: BattleParticipant, turnIndex = 0): BattleMutationContext => {
  const base = context({ participants: [archer, fighter("t", ParticipantSide.ENEMY), fighter("o", ParticipantSide.ALLY)], isDM: true });

  return { ...base, scene: { ...base.scene, turnIndex }, rng: () => 0.5 };
};

const body = (attackId: string, endTurn = false) => attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId, d20Roll: 10, damageRolls: [3], endTurn });

const fresh = (p: BattleParticipant): BattleParticipant => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } });

const ammoOf = (participants: BattleParticipant[], id = "a") => participants.find((p) => p.basicInfo.id === id)!.battleData;

describe("attack mutation ammo", () => {
  it("spends one shot per ranged attack and arms reload at zero", async () => {
    const first = await attackMutation(ctxOf(fighter("a", ParticipantSide.ALLY, { ammo: { bow: 2 } })), body("bow"));

    expect(ammoOf(first.participants).ammo).toEqual({ bow: 1 });

    const second = await attackMutation(ctxOf(fresh(first.participants.find((p) => p.basicInfo.id === "a")!)), body("bow"));

    expect(ammoOf(second.participants).ammo).toEqual({ bow: 0 });
    expect(ammoOf(second.participants).reload).toEqual({ bow: 2 });
  });

  it("rejects an empty weapon without state change", async () => {
    const ctx = ctxOf(fighter("a", ParticipantSide.ALLY, { ammo: { bow: 0 } }));

    await expect(attackMutation(ctx, body("bow"))).rejects.toMatchObject({ message: API_ERRORS.OUT_OF_AMMO });
    expect(ctx.participants[0].battleData.ammo).toEqual({ bow: 0 });
  });

  it("rejects while reloading", async () => {
    const ctx = ctxOf(fighter("a", ParticipantSide.ALLY, { ammo: { bow: 0 }, reload: { bow: 1 } }));

    await expect(attackMutation(ctx, body("bow"))).rejects.toMatchObject({ message: API_ERRORS.WEAPON_RELOADING });
  });

  it("leaves melee and legacy participants alone", async () => {
    const melee = await attackMutation(ctxOf(fighter("a", ParticipantSide.ALLY, { ammo: { bow: 2 } })), body("kn"));

    expect(ammoOf(melee.participants).ammo).toEqual({ bow: 2 });

    const legacy = await attackMutation(ctxOf(fighter("a", ParticipantSide.ALLY)), body("bow"));

    expect(ammoOf(legacy.participants).ammo).toBeUndefined();
  });

  it("owner turn end ticks reload, refilling after the countdown", async () => {
    let ctx = ctxOf(fighter("a", ParticipantSide.ALLY, { ammo: { bow: 1 } }));

    const emptied = await attackMutation(ctx, body("bow", true));

    expect(ammoOf(emptied.participants).reload).toEqual({ bow: 1 });
    ctx = { ...ctx, participants: emptied.participants.map(fresh), scene: { ...ctx.scene, ...emptied.scene } };

    const owner = ctx.participants.findIndex((p) => p.basicInfo.id === "a");

    const knifeHit = await attackMutation({ ...ctx, scene: { ...ctx.scene, turnIndex: owner } }, attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "kn", d20Roll: 10, damageRolls: [2], endTurn: true }));

    expect(ammoOf(knifeHit.participants)).toMatchObject({ ammo: { bow: 2 } });
    expect(ammoOf(knifeHit.participants).reload).toBeUndefined();
  });

  it("another participant's turn end does not tick", async () => {
    const ctx = ctxOf(fighter("a", ParticipantSide.ALLY, { ammo: { bow: 0 }, reload: { bow: 2 } }), 1);

    const out = await attackMutation(ctx, attackBodySchema.parse({ attackerId: "t", targetId: "o", attackId: "kn", d20Roll: 10, damageRolls: [2], endTurn: true }));

    expect(ammoOf(out.participants).reload).toEqual({ bow: 2 });
  });
});
