import type { Prisma, Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { context, goblin, participant } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { channelMutation } from "@/lib/server/battles/mutations/channel/channel-mutation";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { splitParticipant } from "@/lib/utils/battle/store";
import { redactLogForPlayers, redactParticipantsForPlayers } from "@/lib/utils/battle/view";
import { DEFAULT_CHARACTERISTICS, ruleSystemOf } from "@/lib/utils/rules/systems";
import type { SystemSlot } from "@/lib/utils/rules/systems/slot";
import { castOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleParticipant } from "@/types/battle";

const bolt = {
  id: "s1",
  campaignId: "c1",
  name: "Bolt",
  level: 1,
  groupId: null,
  icon: null,
  dice: 0,
  dieSides: null,
  upcastDice: null,
  upcastTargets: null,
  cost: "action",
  casting: { magic: { cn: 3, kind: "arcane", overcast: "dice", attribute: { condition: "ablaze", levels: 1 } } },
  targeting: { kind: "enemy" },
  resolution: { kind: "auto" },
  spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire", byDistance: [{ maxFeet: 10, dice: "1d6" }, { maxFeet: 120, dice: "1d6" }] }],
  raceModifiers: [],
} as unknown as Spell;

const mage = (): BattleParticipant => {
  const p = participant("hero", { controlledBy: "user-1" });

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, int: 40, wp: 40 }, skillAdvances: { "language:magick": 10 } };

  return { ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics) }, spellcasting: { ...p.spellcasting, spellSlots: {}, knownSpells: ["s1"] } };
};

const cast = createSpellMutation({ loadSpell: vi.fn(async () => bolt), loadPool: async () => ({ units: [], races: [] as unknown as Prisma.RaceGetPayload<object>[] }) });

const newTurn = (ps: BattleParticipant[]) => ps.map((p) => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } }));

const find = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

describe("wfrp magic end to end (engine)", () => {
  it("channel, overcast cast with Ablaze, then a fizzle with a minor miscast", async () => {
    const base = context({ participants: [mage(), goblin] });

    let ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules: WFRP_RULES }, rng: () => 0.5 };

    const log: string[] = [];

    const apply = (out: { participants: BattleParticipant[]; events: unknown[] }) => {
      ctx = { ...ctx, participants: newTurn(out.participants) };
      log.push(JSON.stringify(out.events));
    };

    apply(channelMutation(ctx, { participantId: "hero", roll: 20 }));
    expect(find(ctx.participants, "hero").battleData.channelledSl).toBe(2);

    const hit = await cast(ctx, { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [], castRoll: 20 } as never);

    const hitDetails = castOf((hit.events[0].details as { actionDetails: { system?: SystemSlot } }).actionDetails);

    apply(hit);

    const conditions = ruleSystemOf(WFRP_RULES).conditions as NonNullable<ReturnType<typeof ruleSystemOf>["conditions"]>;

    expect(hitDetails?.outcome).toBe("success");
    expect(hitDetails?.overcastSteps).toBe(1);
    expect(conditions.list(find(ctx.participants, "gob"))).toContainEqual(expect.objectContaining({ key: "ablaze" }));
    expect(find(ctx.participants, "hero").battleData.channelledSl).toBe(0);
    expect(find(ctx.participants, "gob").combatStats.currentHp).toBeLessThan(goblin.combatStats.currentHp);

    const miss = await cast(ctx, { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [], castRoll: 77 } as never);

    apply(miss);
    expect(find(ctx.participants, "gob").combatStats.currentHp).toBe(find(miss.participants, "gob").combatStats.currentHp);

    const joined = log.join("\n");

    for (const key of ["wfrpMagic.log.channelSuccess", "wfrpMagic.log.miscast", "battleActions.spell.fizzled"]) expect(joined).toContain(key);

    expect(joined).toMatch(/wfrpMagic\.log\.cast/);

    ctx.participants.forEach((p, i) => expect(splitParticipant(p, { orderIndex: i, isPending: false }).snapshotHash).toMatch(/\S/));
  });

  it("enemy caster miscast: the player view has no miscast line, text, condition or cast miscast", async () => {
    const enemyMage = (): BattleParticipant => {
      const m = mage();

      return { ...m, basicInfo: { ...m.basicInfo, id: "foe", side: ParticipantSide.ENEMY, controlledBy: "dm" } };
    };

    const hero = { ...participant("pc", { controlledBy: "user-2" }) };

    const base = context({ participants: [enemyMage(), { ...hero, basicInfo: { ...hero.basicInfo, side: ParticipantSide.ALLY } }] });

    const ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules: WFRP_RULES }, rng: () => 0.5, isDM: true };

    const out = await cast(ctx, { casterId: "foe", spellId: "s1", targetIds: ["pc"], diceRolls: [], castRoll: 77 } as never);

    expect(JSON.stringify(out.events)).toContain("wfrpMagic.log.miscast");

    const actions = out.events.map((e) => ({ ...(e.details as object), actorId: "foe" })) as never[];

    const { entries: seen, changed } = redactLogForPlayers(actions, { participants: out.participants, rules: WFRP_RULES });

    expect(changed).toBe(true);
    expect(JSON.stringify(seen).replace('"miscast":null', "")).not.toMatch(/miscast/i);
    expect(castOf(seen[0].actionDetails)?.miscast).toBeNull();

    const raw = out.participants.find((p) => p.basicInfo.id === "foe") as BattleParticipant;

    expect(raw.battleData.activeEffects.some((e) => e.concealed)).toBe(true);

    const shown = redactParticipantsForPlayers(out.participants).find((p) => p.basicInfo.id === "foe") as BattleParticipant;

    expect(shown.battleData.activeEffects.some((e) => e.concealed)).toBe(false);
  });
});
