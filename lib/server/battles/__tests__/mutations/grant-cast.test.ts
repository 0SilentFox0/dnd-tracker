import type { Spell } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { processStartOfTurn } from "@/lib/utils/battle/turn/turn-start";
import { applyBattleResult } from "@/lib/utils/characters/resources/battle";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const inlineCast = { targeting: { kind: "enemy" }, resolution: { kind: "auto" }, dice: 1, dieSides: 8, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "slashing" }] };

const row = (over: Record<string, unknown> = {}, grant: Record<string, unknown> = {}) => ({
  id: "sprout", campaignId: "c1", name: "Синтетичний паросток", level: 1, groupId: null, icon: null, dice: 0, cost: "action",
  targeting: { kind: "self" }, resolution: { kind: "auto" }, raceModifiers: [], ...over,
  spellEffects: [{ kind: "grantCast", label: "Удар паростком", cost: "bonusAction", uses: 2, duration: { rounds: 3 }, cast: inlineCast, ...grant }],
} as unknown as Spell);

const hero = () => {
  const base = participant("hero", { controlledBy: "user-1" });

  return { ...base, abilities: { ...base.abilities, damageModel: "5e" as const, level: 5 }, spellcasting: { spellSlots: { "1": { max: 2, current: 2 } }, knownSpells: ["sprout"] } };
};

const run = (spell: Spell, who: BattleParticipant, body: Record<string, unknown>, opts: { round?: number; ps?: BattleParticipant[]; critChoice?: boolean } = {}) => {
  const ctx = context({ participants: opts.ps ?? [who, goblin], rng: () => 0.5, isDM: true, userId: "dm" });

  ctx.scene.round = opts.round ?? 1;

  if (opts.critChoice) ctx.meta = { ...ctx.meta, critChoiceByDm: true, rules: { ...DEFAULT_RULES, criticals: { ...DEFAULT_RULES.criticals, effects: true } } };

  return createSpellMutation({ loadSpell: async () => spell, loadPool: async () => ({ units: [], races: [] }) })(ctx, { casterId: "hero", spellId: "sprout", targetIds: [], diceRolls: [], ...body } as never);
};

const heroOf = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant;

async function granted(over: Record<string, unknown> = {}, grant: Record<string, unknown> = {}, rules = DEFAULT_RULES) {
  const spell = row(over, grant);

  const ctx = context({ participants: [hero(), goblin], rng: () => 0.5, isDM: true, userId: "dm" });

  ctx.meta = { ...ctx.meta, rules };

  const out = await createSpellMutation({ loadSpell: async () => spell, loadPool: async () => ({ units: [], races: [] }) })(ctx, { casterId: "hero", spellId: "sprout", targetIds: [], diceRolls: [] } as never);

  return { spell, out, caster: heroOf(out) };
}

describe("grantCast", () => {
  it("the cast writes an inline grant with a pool and spends the slot of the host spell only", async () => {
    const { caster } = await granted();

    const grant = caster.spellcasting.grants?.[0];

    expect(grant).toMatchObject({ spellId: "sprout", label: "Удар паростком", castCost: "bonusAction", expiresRound: 4, pool: expect.stringMatching(/^pool:cast:/), cost: 1, inline: { dice: 1 } });
    expect(grant?.key).toMatch(/^cast:hero:sprout@1#\d+:0$/);
    expect(caster.battleData.pools?.[grant?.pool as string]).toMatchObject({ max: 2, rest: null });
    expect(caster.spellcasting.spellSlots["1"].current).toBe(1);
  });

  it("an inline cast spends a use and the bonus action, not a slot", async () => {
    const { spell, caster } = await granted();

    const grant = caster.spellcasting.grants?.[0];

    const out = await run(spell, caster, { grantKey: grant?.key, targetIds: ["gob"], diceRolls: [5] });

    const after = heroOf(out);

    expect(after.spellcasting.spellSlots["1"].current).toBe(1);
    expect(after.battleData.abilityUsage?.[grant?.pool as string].battle).toBe(1);
    expect(after.actionFlags.hasUsedBonusAction).toBe(true);
    expect(after.actionFlags.hasUsedAction).toBe(caster.actionFlags.hasUsedAction);
    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBeLessThan(goblin.combatStats.currentHp);
  });

  it("a grant without uses costs nothing and the pool runs out with uses", async () => {
    const free = await granted({}, { uses: undefined });

    expect(free.caster.spellcasting.grants?.[0]).toMatchObject({ cost: 0 });
    expect(free.caster.spellcasting.grants?.[0].pool).toBeUndefined();

    const { spell, caster } = await granted({}, { uses: 1 });

    const key = caster.spellcasting.grants?.[0].key;

    const once = heroOf(await run(spell, caster, { grantKey: key, targetIds: ["gob"], diceRolls: [5] }));

    const next = { ...once, actionFlags: { ...once.actionFlags, hasUsedBonusAction: false } };

    await expect(run(spell, next, { grantKey: key, targetIds: ["gob"], diceRolls: [5] })).rejects.toMatchObject({ message: API_ERRORS.SPELL_USES_EMPTY });
  });

  it("the grant dies after its duration and on a later round the cast is refused", async () => {
    const { spell, caster } = await granted();

    const key = caster.spellcasting.grants?.[0].key;

    await expect(run(spell, caster, { grantKey: key, targetIds: ["gob"], diceRolls: [5] }, { round: 4 })).resolves.toBeTruthy();
    await expect(run(spell, caster, { grantKey: key, targetIds: ["gob"], diceRolls: [5] }, { round: 5 })).rejects.toMatchObject({ message: API_ERRORS.BATTLE_SPELL_SOURCE_UNAVAILABLE });
  });

  it("losing concentration kills the grant lazily", async () => {
    const rules = { ...DEFAULT_RULES, concentration: { enabled: true, dcCap: null } };

    const { spell, caster } = await granted({ concentration: true }, {}, rules);

    const key = caster.spellcasting.grants?.[0].key;

    expect(caster.spellcasting.grants?.[0].concentrationOf).toMatchObject({ casterId: "hero" });
    await expect(run(spell, caster, { grantKey: key, targetIds: ["gob"], diceRolls: [5] })).resolves.toBeTruthy();

    const dropped = { ...caster, battleData: { ...caster.battleData, activeEffects: caster.battleData.activeEffects.filter((e) => !e.concentration) } };

    await expect(run(spell, dropped, { grantKey: key, targetIds: ["gob"], diceRolls: [5] })).rejects.toMatchObject({ message: API_ERRORS.BATTLE_SPELL_SOURCE_UNAVAILABLE });
  });

  it("casting the host spell without grantKey is not ambiguous even with inline grants present", async () => {
    const { spell, caster } = await granted();

    const two = { ...caster, spellcasting: { ...caster.spellcasting, grants: [...(caster.spellcasting.grants ?? []), { ...(caster.spellcasting.grants?.[0] ?? { spellId: "sprout" }), key: "cast:other:1" }] } };

    const out = await run(spell, { ...two, actionFlags: { ...two.actionFlags, hasUsedAction: false } }, { slotKey: "1" });

    expect(heroOf(out).spellcasting.spellSlots["1"].current).toBe(0);
  });

  it("an eventTarget grant goes to the spell target", async () => {
    const ally = participant("ally", { controlledBy: "user-1" });

    const spell = row({ targeting: { kind: "ally" } }, { target: "eventTarget" });

    const c = hero();

    const out = await run(spell, c, { targetIds: ["ally"] }, { ps: [c, ally, goblin] });

    expect(out.participants.find((p) => p.basicInfo.id === "ally")?.spellcasting.grants?.[0]).toMatchObject({ label: "Удар паростком" });
    expect(heroOf(out).spellcasting.grants ?? []).toHaveLength(0);
  });

  it("an inline save cast passes the crit choice pause", async () => {
    const save = { ...inlineCast, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" } };

    const { spell, caster } = await granted({}, { cast: save });

    const key = caster.spellcasting.grants?.[0].key;

    const out = await run(spell, caster, { grantKey: key, targetIds: ["gob"], diceRolls: [5], saveRolls: [{ participantId: "gob", roll: 20 }] }, { critChoice: true });

    expect(out.scene?.pendingCritChoice).toMatchObject({ action: "spell", actorId: "hero" });
  });

  it("start of turn drops dead inline grants with their pools", async () => {
    const { caster } = await granted();

    const pool = caster.spellcasting.grants?.[0].pool as string;

    const alive = processStartOfTurn(caster, 4, [caster, goblin], () => 0.5);

    expect(alive.participant.spellcasting.grants).toHaveLength(1);

    const gone = processStartOfTurn(caster, 5, [caster, goblin], () => 0.5);

    expect(gone.participant.spellcasting.grants).toHaveLength(0);
    expect(gone.participant.battleData.pools?.[pool]).toBeUndefined();
  });

  it("cast pools never reach the persisted character resources", async () => {
    const { spell, caster } = await granted();

    const key = caster.spellcasting.grants?.[0].key;

    const used = heroOf(await run(spell, caster, { grantKey: key, targetIds: ["gob"], diceRolls: [5] }));

    expect(Object.keys(applyBattleResult({}, used).charges ?? {}).filter((k) => k.startsWith("pool:cast:"))).toEqual([]);
  });
});
