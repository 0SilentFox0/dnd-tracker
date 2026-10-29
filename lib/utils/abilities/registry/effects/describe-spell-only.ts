import { seg, type Segment } from "@/lib/utils/abilities/segments";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

type SpellOnly = Extract<SpellEffect, { kind: "inputDice" | "grantCast" | "hitRider" | "anchoredZone" | "summonInline" | "transform" | "moveSelf" | "createTerrain" | "chooseOne" }>;

const SPELL_ONLY_KINDS = new Set(["inputDice", "grantCast", "hitRider", "anchoredZone", "summonInline", "transform", "moveSelf", "createTerrain", "chooseOne"]);

export const isSpellOnlyEffect = (e: { kind: string }): e is SpellOnly => SPELL_ONLY_KINDS.has(e.kind);

const yn = (v: unknown) => (v ? "yes" : "no");

const list = (effects: readonly SpellEffect[], describe: (e: SpellEffect) => Segment[], sep = ", ") => ({ join: sep, items: effects.flatMap(describe) });

export function describeSpellOnly(effect: SpellOnly, describe: (e: SpellEffect) => Segment[]): Segment[] {
  switch (effect.kind) {
    case "inputDice":
      return [seg("summary.spellOnly.inputDice", { max: effect.max, label: effect.label })];

    case "grantCast":
      return [seg("summary.spellOnly.grantCast", { label: effect.label, cost: seg(`summary.spellOnly.cost.${effect.cost}`), hasUses: yn(effect.uses), uses: effect.uses ?? 0, rounds: effect.duration.rounds })];

    case "hitRider":
      return [
        seg("summary.spellOnly.hitRider", {
          charges: effect.charges,
          dice: effect.extraDice,
          type: effect.damageType,
          attack: seg(`summary.spellOnly.attack.${effect.attackKind}`),
          consumeOnMiss: yn(effect.consumeOnMiss),
          hasSave: yn(effect.save),
          ability: effect.save?.ability ?? "",
          onFail: effect.save ? list(effect.save.onFail, describe) : "",
        }),
      ];

    case "anchoredZone":
      return [
        seg("summary.spellOnly.anchoredZone", {
          radius: effect.radiusFeet,
          side: seg(`summary.spellOnly.side.${effect.side}`),
          excludeBearer: yn(effect.excludeBearer),
          rounds: effect.duration.rounds,
          hasEnter: yn(effect.onEnter),
          enter: effect.onEnter ? list(effect.onEnter.effects, describe) : "",
          hasTurnStart: yn(effect.onTurnStart),
          turnStart: effect.onTurnStart ? list(effect.onTurnStart.effects, describe) : "",
          endsOutside: yn(effect.endsWhenStartOutside),
        }),
      ];

    case "summonInline":
      return [
        seg("summary.spellOnly.summonInline", {
          count: effect.count,
          name: effect.name,
          hp: effect.hp === null ? seg("summary.spellOnly.item") : seg("summary.spellOnly.hp", { hp: effect.hp }),
          ac: effect.ac === "spellDc" ? seg("summary.spellOnly.acSpellDc") : seg("summary.text", { value: effect.ac }),
          rounds: effect.duration.rounds,
          hasUpcast: yn(effect.upcastEvery),
          upcastEvery: effect.upcastEvery ?? 0,
          hasAura: yn(effect.aura),
          auraRadius: effect.aura?.radiusFeet ?? 0,
          auraAttack: yn(effect.aura?.onEnter?.attack || effect.aura?.onTurnStart?.attack),
        }),
      ];

    case "transform":
      return [seg("summary.spellOnly.transform", { rounds: effect.duration.rounds })];

    case "moveSelf":
      return [seg("summary.spellOnly.moveSelf")];

    case "createTerrain":
      return [seg("summary.spellOnly.createTerrain", { terrain: seg(`summary.spellOnly.terrain.${effect.terrain}`), shape: seg(`summary.spellOnly.shape.${effect.shape}`), cells: effect.cells, rounds: effect.rounds })];

    case "chooseOne":
      return [seg("summary.spellOnly.chooseOne", { options: list(effect.options, describe, " / ") })];
  }
}
