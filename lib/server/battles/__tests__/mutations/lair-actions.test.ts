import { API_ERRORS } from "@/lib/constants/api-errors";
import { describe, expect, it } from "vitest";

import { context, hero, participant } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { legendaryMutation } from "@/lib/server/battles/mutations/core-action/legendary-mutation";
import { patchParticipantMutation } from "@/lib/server/battles/mutations/participants/patch-participant-mutation";
import { patchParticipantSchema } from "@/lib/server/battles/mutations/participants/patch-participant-schema";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { legendaryActionSchema } from "@/lib/utils/battle/actions/schema";
import { resolveSave } from "@/lib/utils/battle/saves/legendary";
import { joinParticipant, splitParticipant } from "@/lib/utils/battle/store/split-participant";
import { processStartOfRound } from "@/lib/utils/battle/turn/start-end";
import type { BattleParticipant } from "@/types/battle";

const a = resolved({ id: "quake", name: "Землетрус", trigger: { event: "action" }, limits: { lair: true }, effects: [{ kind: "changeMorale", delta: 1 }] });

const b = { ...a, id: "fog", key: "unit:dragon:fog", name: "Туман" };

const dragon = (): BattleParticipant => {
  const p = participant("dragon", { name: "Дракон", side: ParticipantSide.ENEMY });

  return { ...p, battleData: { ...p.battleData, resolvedAbilities: [a, b], legendary: { actions: 3, actionsLeft: 3, resistLeft: 2 }, lairResistances: 4, lair: { active: true, baseResistances: 2, resistSpent: 0 } } };
};

const dm = (p: BattleParticipant, round = 1) => context({ isDM: true, userId: "dm", participants: [hero, p], scene: { ...context().scene, round, turnIndex: 1 } });

const body = (key = a.key) => legendaryActionSchema.parse({ action: "legendary", participantId: "dragon", option: { kind: "lair", abilityKey: key } });

const actor = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "dragon") ?? (() => { throw new Error("dragon missing"); })();

describe("lair actions", () => {
  it("works on the owner's turn without spending legendary actions, once a round", async () => {
    const out = await legendaryMutation(dm(dragon()), body());

    const p = actor(out);

    expect(p.battleData.legendary?.actionsLeft).toBe(3);
    expect(p.battleData.lair).toMatchObject({ usedRound: 1, lastKey: a.key });
    expect(p.combatStats.morale).toBe(1);
    await expect(legendaryMutation(dm(p), body(b.key))).rejects.toMatchObject({ message: API_ERRORS.LAIR_USED });
    await expect(legendaryMutation(dm(p, 2), body())).rejects.toMatchObject({ message: API_ERRORS.LAIR_REPEAT });
    expect(actor(await legendaryMutation(dm(p, 2), body(b.key))).battleData.lair?.lastKey).toBe(b.key);
    expect(actor(await legendaryMutation(dm(p, 3), body())).battleData.lair?.usedRound).toBe(3);
  });

  it("rejects inactive lairs and players without spending", async () => {
    const p = dragon();

    p.battleData.lair = { active: false, baseResistances: 2, resistSpent: 0 };
    await expect(legendaryMutation(dm(p), body())).rejects.toMatchObject({ message: API_ERRORS.LAIR_NOT_ACTIVE });
    await expect(legendaryMutation({ ...dm(dragon()), isDM: false }, body())).rejects.toMatchObject({ status: 403 });
    expect(p.battleData.abilityUsage).toBeUndefined();
  });

  it("round start announces available lair actions and does not fire them", () => {
    const p = dragon();

    const out = processStartOfRound([p], 2);

    expect(out.lairMessages).toEqual(["🏰 Ініціатива 20: дія лігва — Дракон"]);
    expect(out.updatedInitiativeOrder[0].combatStats.morale).toBe(0);
  });
});

describe("DM lair toggles", () => {
  it("tracks spent resistances across toggles and round-trips with updated snapshot hash", () => {
    const p = dragon();

    p.battleData.lair = { active: false, baseResistances: 2, resistSpent: 0 };

    const stored = splitParticipant(p, { orderIndex: 1, isPending: false });

    const active = actor(patchParticipantMutation(dm(p), "dragon", patchParticipantSchema.parse({ lairActive: true })));

    expect(active.battleData.legendary?.resistLeft).toBe(4);

    const spent = resolveSave(active, { success: false }).participant;

    expect(spent.battleData.lair?.resistSpent).toBe(1);

    const off = actor(patchParticipantMutation(dm(spent), "dragon", { lairActive: false }));

    expect(off.battleData.legendary?.resistLeft).toBe(1);

    const on = actor(patchParticipantMutation(dm(off), "dragon", { lairActive: true }));

    expect(on.battleData.legendary?.resistLeft).toBe(3);

    const after = splitParticipant(on, { orderIndex: 1, isPending: false });

    expect(after.snapshotHash).not.toBe(stored.snapshotHash);
    expect(joinParticipant(after, "b1").battleData.lair).toEqual(on.battleData.lair);
  });

  it("allows only DM to toggle", () => {
    expect(() => patchParticipantMutation({ ...dm(dragon()), isDM: false }, "dragon", { lairActive: true })).toThrow();
  });
});
