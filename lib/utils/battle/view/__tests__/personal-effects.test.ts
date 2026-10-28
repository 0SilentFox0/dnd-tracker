import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeEffect, makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { displayEffects, personalPassiveEffects } from "@/lib/utils/battle/view";

const personal = (effects: Parameters<typeof resolved>[0]["effects"], id = "p") => resolved({ id, name: "Полум'яна аура", trigger: { event: "passive" }, effects }, { personal: true, name: "Аграїл: Полум'яна аура" });

describe("personalPassiveEffects", () => {
  it("свої пасивки — собі, аури — союзникам або ворогам; від інших вмінь — нічого", () => {
    const agrail = makeParticipant({ id: "ag", abilities: [personal([{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }], "self"), personal([{ kind: "modifyStat", stat: "armor", flat: 1, target: "allAllies" }], "aura"), resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] })] });

    const friend = makeParticipant({ id: "fr" });

    const foe = makeParticipant({ id: "fo", side: ParticipantSide.ENEMY });

    const order = [agrail, friend, foe];

    expect(personalPassiveEffects(agrail, order).map((e) => e.abilityEffects?.[0].kind)).toEqual(["damageBonus", "modifyStat"]);
    expect(personalPassiveEffects(friend, order)).toHaveLength(1);
    expect(personalPassiveEffects(friend, order)[0]).toMatchObject({ permanent: true, type: "buff", source: { participantId: "ag", personal: true } });
    expect(personalPassiveEffects(foe, order)).toHaveLength(0);
  });

  it("дедуп аур рахує силу лише по ефектах-аурах; власні ефекти лишаються окремим записом", () => {
    const mixed = (id: string, own: number) => makeParticipant({ id, abilities: [personal([{ kind: "modifyStat", stat: "armor", flat: own, target: "self" }, { kind: "modifyStat", stat: "armor", flat: 1, target: "allAllies" }], "shared")] });

    const a = mixed("a", 5);

    const b = mixed("b", 0);

    const effects = personalPassiveEffects(a, [a, b]);

    expect(effects.filter((e) => e.source?.participantId === "a")).toHaveLength(2);
    expect(effects.filter((e) => e.source?.participantId === "b")).toHaveLength(0);
    expect(effects.find((e) => e.id.endsWith(":own"))?.abilityEffects).toHaveLength(1);
  });

  it("умовна пасивка показується лише коли умова виконана", () => {
    const wrath = resolved({ id: "w", name: "Гнів за своїх", trigger: { event: "passive" }, condition: { type: "hpBelow", who: "anyAlly", percent: 15 }, effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 20 }] }, { personal: true, name: "Годрик" });

    const godric = makeParticipant({ id: "g", abilities: [wrath] });

    const friend = makeParticipant({ id: "fr" });

    expect(personalPassiveEffects(godric, [godric, friend])).toHaveLength(0);

    const hurt = { ...friend, combatStats: { ...friend.combatStats, currentHp: 1 } };

    expect(personalPassiveEffects(godric, [godric, hurt])).toHaveLength(1);
  });

  it("displayEffects не показує зону мертвого власника", () => {
    const fear = makeEffect("fear", { name: "Аура страху", zone: { ownerId: "n", key: "fear" }, abilityEffects: [{ kind: "modifyStat", stat: "morale", flat: -1 }] });

    const base = makeParticipant({ id: "h" });

    const hero = { ...base, battleData: { ...base.battleData, activeEffects: [fear] } };

    expect(displayEffects(hero, [hero, makeParticipant({ id: "n", side: ParticipantSide.ENEMY })]).map((e) => e.name)).toEqual(["Аура страху"]);

    const owner = makeParticipant({ id: "n", side: ParticipantSide.ENEMY, hp: 0 });

    expect(displayEffects(hero, [hero, { ...owner, combatStats: { ...owner.combatStats, status: CombatStatus.DEAD } }])).toHaveLength(0);
  });
});
