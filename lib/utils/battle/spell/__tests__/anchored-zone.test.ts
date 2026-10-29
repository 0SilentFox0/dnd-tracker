import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { dropConcentration } from "@/lib/utils/battle/concentration";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import { castSpell } from "@/lib/utils/battle/spell";
import { sweepOrphanedAnchored } from "@/lib/utils/battle/spell/anchored-zone";
import { zoneMove, zoneTurnStart } from "@/lib/utils/battle/spell/zone-triggers";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { AnchoredZoneEffect, SpellEffect } from "@/lib/utils/spells/model/schema";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 30, rows: 10, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position } });

const mage = () => {
  const c = at(makeParticipant({ id: "mage" }), { x: 0, y: 0 });

  return { ...c, spellcasting: { ...c.spellcasting, spellSaveDC: 99, spellSlots: { "3": { max: 2, current: 2 } } } };
};

const king = () => at(makeParticipant({ id: "king", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 }), { x: 10, y: 5 });

const walker = (x: number, side: ParticipantSide = ParticipantSide.ENEMY) => at(makeParticipant({ id: "walker", side, hp: 100, maxHp: 100 }), { x, y: 5 });

const damage: SpellEffect = { kind: "dealDamage", amount: 5, damageType: "psychic", target: "eventTarget" };

const aura = (over: Partial<AnchoredZoneEffect> = {}): AnchoredZoneEffect => ({
  kind: "anchoredZone",
  radiusFeet: 10,
  side: "all",
  excludeBearer: true,
  onEnter: { save: { ability: "charisma" }, effects: [{ kind: "applyCondition", condition: "skip_action", duration: { rounds: 3 } }, { kind: "applyCondition", condition: "no_bonus_action", duration: { rounds: 3 } }] },
  endsWhenStartOutside: true,
  duration: { rounds: 10 },
  ...over,
});

const spellOf = (effect: SpellEffect): CastableSpell => ({
  id: "festival",
  name: "Синтетична аура",
  level: 3,
  groupId: null,
  definition: { dice: 0, cost: "action", concentration: true, targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects: [effect], raceModifiers: [] },
});

const cast = (effect: AnchoredZoneEffect = aura(), others: BattleParticipant[] = []) => {
  const c = mage();

  const r = castSpell({ caster: c, spell: spellOf(effect), targetIds: ["king"], allParticipants: [c, king(), ...others], currentRound: 1, battleId: "b", diceRolls: [], rng: () => 0.5, map, rules: { ...DEFAULT_RULES, concentration: { enabled: true, dcCap: null } } });

  return r.allParticipantsUpdated as BattleParticipant[];
};

const get = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

const walk = (ps: BattleParticipant[], from: number, to: number, id = "walker", round = 1) => {
  const w = get(ps, id);

  const y = w.battleData.position?.y ?? 5;

  const path = Array.from({ length: Math.abs(to - from) }, (_, i) => ({ x: from + (to > from ? i + 1 : -(i + 1)), y }));

  const moved = at(w, { x: to, y });

  return zoneMove({ map, participants: ps.map((p) => (p.basicInfo.id === id ? moved : p)), moved, from: { x: from, y }, path, round, rng: () => 0.5 });
};

describe("anchoredZone", () => {
  it("каст кладе ауру на ціль із концентрацією", () => {
    const ps = cast();

    const effect = get(ps, "king").battleData.activeEffects.find((e) => e.anchoredZone);

    expect(effect).toMatchObject({ duration: 10, anchoredZone: { radiusFeet: 10, dc: 99, casterId: "mage" }, concentrationOf: { casterId: "mage" } });
    expect(get(ps, "mage").battleData.activeEffects.find((e) => e.concentration)?.concentration?.tracksEffects).toBe(true);
  });

  it("істота входить у радіус: провал рятівного дає стани, прив'язані до аури", () => {
    const out = walk(cast(aura(), [walker(16)]), 16, 12);

    const w = get(out.participants, "walker");

    expect(hasEffectMarker(w, "skip_action")).toBe(true);
    expect(hasEffectMarker(w, "no_bonus_action")).toBe(true);
    expect(w.battleData.activeEffects.filter((e) => e.anchorOf).every((e) => e.concentrationOf)).toBe(true);
    expect(out.messages.join(" ")).toContain("рятівний");
  });

  it("далекий рух не спрацьовує; повторний вхід за раунд — один тригер", () => {
    const ps = cast(aura({ onEnter: { effects: [damage as never] } }), [walker(20)]);

    expect(walk(ps, 20, 17).messages).toEqual([]);

    const first = walk(cast(aura({ onEnter: { effects: [damage as never] } }), [walker(16)]), 16, 12);

    expect(get(first.participants, "walker").combatStats.currentHp).toBe(95);

    const back = walk(first.participants, 12, 16);

    const again = walk(back.participants, 16, 12);

    expect(get(again.participants, "walker").combatStats.currentHp).toBe(95);
  });

  it("носій наближається до істоти — тригер спрацьовує на неї", () => {
    const out = walk(cast(aura({ onEnter: { effects: [damage as never] } }), [walker(5)]), 10, 7, "king");

    expect(get(out.participants, "walker").combatStats.currentHp).toBe(95);
    expect(get(out.participants, "king").combatStats.currentHp).toBe(100);
  });

  it("предмет заклинання (кущ) поруч із носієм не отримує ефектів ауры", () => {
    const base = walker(5);

    const bush = { ...base, basicInfo: { ...base.basicInfo, id: "bush" }, battleData: { ...base.battleData, object: { spellId: "x" } } };

    const out = walk(cast(aura({ onEnter: { effects: [damage as never] } }), [bush, walker(5)]), 10, 7, "king");

    expect(get(out.participants, "bush").combatStats.currentHp).toBe(100);
    expect(get(out.participants, "walker").combatStats.currentHp).toBe(95);
  });

  it("сторона allies не чіпає ворогів кастера", () => {
    const foes = cast(aura({ side: "allies", onEnter: { effects: [damage as never] } }), [walker(16)]);

    expect(get(walk(foes, 16, 12).participants, "walker").combatStats.currentHp).toBe(100);

    const friends = cast(aura({ side: "allies", onEnter: { effects: [damage as never] } }), [walker(16, ParticipantSide.ALLY)]);

    expect(get(walk(friends, 16, 12).participants, "walker").combatStats.currentHp).toBe(95);
  });

  it("початок ходу поза аурою знімає накладене, всередині — лишає", () => {
    const hit = walk(cast(aura(), [walker(16)]), 16, 12).participants;

    const inside = zoneTurnStart(map, hit, "walker", { round: 2, rng: () => 0.5 });

    expect(hasEffectMarker(get(inside.participants, "walker"), "skip_action")).toBe(true);

    const away = hit.map((p) => (p.basicInfo.id === "walker" ? at(p, { x: 25, y: 5 }) : p));

    const outside = zoneTurnStart(map, away, "walker", { round: 2, rng: () => 0.5 });

    expect(hasEffectMarker(get(outside.participants, "walker"), "skip_action")).toBe(false);
  });

  it("onTurnStart спрацьовує щоходу для істот у радіусі", () => {
    const ps = cast(aura({ onEnter: undefined, onTurnStart: { effects: [{ ...damage, amount: 3 } as never] } }), [walker(12)]);

    const t1 = zoneTurnStart(map, ps, "walker", { round: 2, rng: () => 0.5 });

    const t2 = zoneTurnStart(map, t1.participants, "walker", { round: 3, rng: () => 0.5 });

    expect(get(t2.participants, "walker").combatStats.currentHp).toBe(94);
  });

  it("аура зникла — накладені нею стани прибираються, без аур масив той самий", () => {
    const hit = walk(cast(aura(), [walker(16)]), 16, 12).participants;

    expect(sweepOrphanedAnchored(hit)).toBe(hit);

    const stripped = hit.map((p) => (p.basicInfo.id === "king" ? { ...p, battleData: { ...p.battleData, activeEffects: [] } } : p));

    expect(hasEffectMarker(get(sweepOrphanedAnchored(stripped), "walker"), "skip_action")).toBe(false);
  });

  it("втрата концентрації прибирає ауру і накладені стани", () => {
    const hit = walk(cast(aura(), [walker(16)]), 16, 12).participants;

    const dropped = dropConcentration(hit, "mage", "").participants;

    expect(get(dropped, "king").battleData.activeEffects.some((e) => e.anchoredZone)).toBe(false);
    expect(hasEffectMarker(get(dropped, "walker"), "skip_action")).toBe(false);
  });
});
