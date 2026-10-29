import { describe, expect, it } from "vitest";

import { canStandUp, coreActionAvailability, coreActionCost } from "../availability";
import { runCoreAction } from "../run";
import { coreActionSchema } from "../schema";

import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { activeEffectIds, consumeAttackEffects } from "@/lib/utils/battle/attack/consume-effects";
import { passivePerception } from "@/lib/utils/battle/checks";
import { applyCondition5e } from "@/lib/utils/battle/conditions";
import { baseMovement, remainingMovement } from "@/lib/utils/battle/grid/path";
import { finishTurnEffects } from "@/lib/utils/battle/turn/end-turn-cleanup";
import { processStartOfTurn } from "@/lib/utils/battle/turn/start-end";
import { resetTurnState } from "@/lib/utils/battle/turn/turn-state";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const mk = (id: string, side: "ally" | "enemy" = "ally", x = 0): BattleParticipant => {
  const base = createMockParticipant();

  return { ...base, basicInfo: { ...base.basicInfo, id, name: id, side: side as never }, battleData: { ...base.battleData, position: { x, y: 0 } } };
};

const rules = { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true } };

const run = (participants: BattleParticipant[], body: Parameters<typeof runCoreAction>[0]["body"], useMap: BattleMapConfig | null = null) =>
  runCoreAction({ participants, body, map: useMap, rules, round: 1, rng: () => 0.5, battleId: "b1" });

const get = (r: { participants: BattleParticipant[] }, id: string) => r.participants.find((p) => p.basicInfo.id === id)!;

describe("core actions", () => {
  it("схема приймає всі гілки", () => {
    expect(coreActionSchema.safeParse({ action: "shove", participantId: "a", targetId: "b", mode: "push" }).success).toBe(true);
    expect(coreActionSchema.safeParse({ action: "help", participantId: "a" }).success).toBe(false);
  });

  it("dash подвоює залишок руху і витрачає дію", () => {
    const a = mk("a");

    const before = remainingMovement(a);

    const out = get(run([a], { action: "dash", participantId: "a" }), "a");

    expect(out.actionFlags.hasUsedAction).toBe(true);
    expect(remainingMovement(out)).toBe(before * 2);
    expect(resetTurnState(out).extraMovement).toBeUndefined();
  });

  it("повторний dash додає базову швидкість, а не накопичений бюджет", () => {
    const a = mk("a");

    const base = baseMovement(a);

    const first = get(run([a], { action: "dash", participantId: "a" }), "a");

    const again = get(run([{ ...first, actionFlags: { ...first.actionFlags, hasUsedAction: false } }], { action: "dash", participantId: "a" }), "a");

    expect(again.battleData.extraMovement).toBe(base * 2);
    expect(remainingMovement(again)).toBe(base * 3);
  });

  it("відмова, якщо дію вже витрачено", () => {
    const a = { ...mk("a"), actionFlags: { ...mk("a").actionFlags, hasUsedAction: true } };

    expect(() => run([a], { action: "dodge", participantId: "a" })).toThrow(expect.objectContaining({ code: "action_used" }));
  });

  it("disengage знімається наприкінці ходу", () => {
    const out = get(run([mk("a")], { action: "disengage", participantId: "a" }), "a");

    expect(out.battleData.activeEffects[0]).toMatchObject({ abilityKey: "core:disengage:a", armed: true, expireAtTurnEnd: true });
    expect(finishTurnEffects(out).participant.battleData.activeEffects).toHaveLength(0);
  });

  it("dodge діє до початку наступного ходу", () => {
    const out = get(run([mk("a")], { action: "dodge", participantId: "a" }), "a");

    expect(out.battleData.activeEffects[0].abilityEffects).toHaveLength(2);
    expect(finishTurnEffects(out).participant.battleData.activeEffects).toHaveLength(1);

    const started = processStartOfTurn(out, 2, [out], () => 0.5, null, rules);

    expect(started.participant.battleData.activeEffects).toHaveLength(0);
  });

  it("dodge знімається, коли власник стає недієздатним", () => {
    const dodged = run([mk("a")], { action: "dodge", participantId: "a" }).participants;

    const res = applyCondition5e(dodged, "a", { key: "stunned", rounds: 1, source: undefined, sourceName: "t", timedKey: "t", round: 1, rules });

    expect(get(res, "a").battleData.activeEffects.some((e) => e.abilityKey === "core:dodge:a")).toBe(false);
  });

  it("help: ефект на союзнику споживається його атакою; не союзник і несуміжний — відмова", () => {
    const a = mk("a", "ally", 0);

    const ally = mk("ally2", "ally", 1);

    const out = run([a, ally], { action: "help", participantId: "a", targetId: "ally2" }, map);

    const helped = get(out, "ally2");

    expect(helped.battleData.activeEffects[0]).toMatchObject({ consumeOn: "ownAttack", duration: 1 });
    expect(get(out, "a").actionFlags.hasUsedAction).toBe(true);

    const used = consumeAttackEffects(out.participants, { attackerId: "ally2", targetId: "a", hit: true, existedBefore: activeEffectIds(out.participants) });

    expect(get({ participants: used }, "ally2").battleData.activeEffects).toHaveLength(0);

    expect(() => run([a, mk("foe", "enemy", 1)], { action: "help", participantId: "a", targetId: "foe" }, map)).toThrow(expect.objectContaining({ code: "action_rejected" }));
    expect(() => run([a, mk("far", "ally", 6)], { action: "help", participantId: "a", targetId: "far" }, map)).toThrow(expect.objectContaining({ code: "action_rejected" }));
    expect(run([a, mk("far", "ally", 6)], { action: "help", participantId: "a", targetId: "far" }).participants).toHaveLength(2);
  });

  it("standUp: знімає prone і витрачає половину руху; відмови", () => {
    const a = mk("a");

    const prone = applyCondition5e([a], "a", { key: "prone", rounds: 3, source: undefined, sourceName: "t", timedKey: "t", round: 1, rules });

    const out = get(run(prone.participants, { action: "standUp", participantId: "a" }), "a");

    expect(out.battleData.activeEffects).toHaveLength(0);
    expect(out.battleData.movementUsed).toBe(3);
    expect(out.actionFlags.hasUsedAction).toBe(false);

    expect(() => run([a], { action: "standUp", participantId: "a" })).toThrow(expect.objectContaining({ message: "Ви не лежите" }));

    const tired = { ...get(prone, "a"), battleData: { ...get(prone, "a").battleData, movementUsed: 4 } };

    expect(() => run([tired], { action: "standUp", participantId: "a" })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("standUp після Ривка коштує половину базової швидкості; при швидкості 0 — відмова й недоступний", () => {
    const a = mk("a");

    const prone = get(applyCondition5e([a], "a", { key: "prone", rounds: 3, source: undefined, sourceName: "t", timedKey: "t", round: 1, rules }), "a");

    const dashed = { ...prone, battleData: { ...prone.battleData, extraMovement: 6 } };

    expect(get(run([dashed], { action: "standUp", participantId: "a" }), "a").battleData.movementUsed).toBe(3);

    const held = applyCondition5e([prone, mk("g", "enemy", 1)], "a", { key: "grappled", rounds: 99, permanent: true, source: { participantId: "g", name: "g" }, sourceName: "g", timedKey: "core:grapple:g", round: 1, rules }).participants;

    const stuck = get({ participants: held }, "a");

    expect(baseMovement(stuck)).toBe(0);
    expect(() => run(held, { action: "standUp", participantId: "a" })).toThrow(expect.objectContaining({ message: "Не можна встати: швидкість 0" }));
    expect(canStandUp(stuck)).toBe(false);
    expect(coreActionAvailability("standUp", stuck, held, null)).toEqual({ ok: false, reason: "Не можна встати: швидкість 0" });
  });
});

describe("hide / ready / readiedAttack", () => {
  const stealthy = (id: string, mod: number, side: "ally" | "enemy" = "ally", x = 0) => {
    const p = mk(id, side, x);

    return { ...p, abilities: { ...p.abilities, modifiers: { ...p.abilities.modifiers, dexterity: mod } } };
  };

  const hideRun = (a: BattleParticipant, foe: BattleParticipant, rng: () => number) =>
    runCoreAction({ participants: [a, foe], body: { action: "hide", participantId: a.basicInfo.id }, map: null, rules, round: 1, rng, battleId: "b1" });

  it("hide: успіх (>=) дає «Схований», провал — лише лог; дію витрачено", () => {
    const foe = mk("foe", "enemy");

    const dc = passivePerception(foe, [foe], rules);

    const win = hideRun(stealthy("a", 30), foe, () => 0.5);

    const hidden = get(win, "a");

    expect(hidden.actionFlags.hasUsedAction).toBe(true);
    expect(hidden.battleData.activeEffects[0]).toMatchObject({ name: "Схований", consumeOn: "ownAttack", duration: 10, effects: [{ type: "hidden" }] });
    expect(hidden.battleData.activeEffects[0].abilityEffects).toHaveLength(2);

    const tie = hideRun(stealthy("a", dc - 11), foe, () => 0.5);

    expect(get(tie, "a").battleData.activeEffects).toHaveLength(1);

    const fail = hideRun(stealthy("a", dc - 12), foe, () => 0.5);

    expect(get(fail, "a").battleData.activeEffects).toHaveLength(0);
    expect(get(fail, "a").actionFlags.hasUsedAction).toBe(true);
  });

  it("ready: ставить readied, витрачає дію; resetTurnState знімає", () => {
    const out = get(run([mk("a")], { action: "ready", participantId: "a" }), "a");

    expect(out.battleData.readied).toEqual({ kind: "attack", round: 1 });
    expect(out.actionFlags.hasUsedAction).toBe(true);
    expect(resetTurnState(out).readied).toBeUndefined();
  });

  const sword = { id: "sw", name: "Меч", type: "melee" as never, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

  const withSword = (p: BattleParticipant, readied = true): BattleParticipant => ({ ...p, battleData: { ...p.battleData, attacks: [sword], readied: readied ? { kind: "attack", round: 1 } : undefined } });

  it("readiedAttack: атакує, витрачає реакцію, знімає readied; не витрачає дію", () => {
    const a = withSword(mk("a", "ally", 0));

    const out = run([a, mk("foe", "enemy", 1)], { action: "readiedAttack", participantId: "a", targetId: "foe" }, map);

    expect(out.actions?.[0]).toMatchObject({ actionType: "retaliation", actorId: "a" });
    expect(eventTextOf(out.actions?.[0] as never).startsWith("Підготовлена атака:")).toBe(true);
    expect(get(out, "a").actionFlags).toMatchObject({ hasUsedReaction: true, hasUsedAction: false });
    expect(get(out, "a").battleData.readied).toBeUndefined();
  });

  it("readiedAttack: відмови", () => {
    const a = withSword(mk("a", "ally", 0));

    const foe = mk("foe", "enemy", 1);

    const call = (ps: BattleParticipant[], target = "foe", m: BattleMapConfig | null = map) => () => run(ps, { action: "readiedAttack", participantId: "a", targetId: target }, m);

    expect(call([withSword(a, false), foe])).toThrow(expect.objectContaining({ message: "Атаку не підготовлено" }));
    expect(call([{ ...a, actionFlags: { ...a.actionFlags, hasUsedReaction: true } }, foe])).toThrow(expect.objectContaining({ message: "Реакцію вже витрачено" }));
    expect(call([a, mk("friend", "ally", 1)], "friend")).toThrow(expect.objectContaining({ code: "action_rejected" }));
    expect(call([a, mk("far", "enemy", 6)], "far")).toThrow(expect.objectContaining({ code: "action_rejected" }));
    expect(call([a, mk("far", "enemy", 6)], "far", null)).not.toThrow();

    const charmed = applyCondition5e([a, foe], "a", { key: "charmed", rounds: 3, source: { participantId: "foe", name: "foe" }, sourceName: "foe", timedKey: "t", round: 1, rules }).participants;

    expect(call(charmed)).toThrow(expect.objectContaining({ code: "invalid_target" }));
  });

  it("readiedAttack: недієздатний або з маркером no_reaction не стріляє", () => {
    const a = withSword(mk("a", "ally", 0));

    const foe = mk("foe", "enemy", 1);

    const call = (ps: BattleParticipant[]) => () => run(ps, { action: "readiedAttack", participantId: "a", targetId: "foe" }, map);

    expect(call([a, foe])).not.toThrow();

    const stunned = applyCondition5e([a, foe], "a", { key: "incapacitated", rounds: 3, source: { participantId: "foe", name: "foe" }, sourceName: "foe", timedKey: "t", round: 1, rules }).participants;

    expect(call(stunned)).toThrow(expect.objectContaining({ code: "action_rejected" }));

    const marked = [{ ...a, battleData: { ...a.battleData, activeEffects: [{ id: "nr", type: "debuff", name: "Без реакції", effects: [{ type: "no_reaction", value: 1 }], remainingRounds: 1 } as never] } }, foe];

    expect(call(marked)).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });
});

describe("Cunning Action", () => {
  const rogue = () => grantPassive(mk("a"), [{ kind: "flag", flag: "cunningAction" }], "Cunning Action");

  it("dash/disengage/hide коштують бонусну дію лише носію", () => {
    expect(coreActionCost("dash", rogue(), [])).toBe("bonusAction");
    expect(coreActionCost("hide", rogue(), [])).toBe("bonusAction");
    expect(coreActionCost("dodge", rogue(), [])).toBe("action");
    expect(coreActionCost("dash", mk("a"), [])).toBe("action");
  });

  it("dash витрачає бонусну дію, не дію; повтор заблоковано", () => {
    const out = get(run([rogue()], { action: "dash", participantId: "a" }), "a");

    expect(out.actionFlags.hasUsedBonusAction).toBe(true);
    expect(out.actionFlags.hasUsedAction).toBe(false);
    expect(coreActionAvailability("dash", out, [out], null).ok).toBe(false);
  });
});
