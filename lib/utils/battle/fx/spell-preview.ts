import { aurasOf } from "./aura";
import { frameKindOf, type FxFrameKind } from "./frame-kind";
import { impactFor } from "./impact";
import { mapAction } from "./map-action";
import { previewParticipant } from "./preview-participant";
import { PREVIEW_UNITS, type PreviewUnitId } from "./preview-units";
import type { SpellFx } from "./spells";
import type { FxAuraKind, FxSpec } from "./types";

import type { LibrarySpell } from "@/data/library/types";
import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { targetingLabel } from "@/lib/utils/spells/model/labels";
import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import type { SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";
import type { SpellRules } from "@/types/spells";

export interface SpellFxTarget {
  id: string;
  frame: FxFrameKind | null;
  auras: FxAuraKind[];
}

interface SpellFxResult {
  spec: FxSpec | null;
  /** Arena units the spell is aimed at (the caster stands apart). */
  targetIds: PreviewUnitId[];
  /** Arena units the cast changed: hit frame (HP changed) and auras after the cast. */
  targets: SpellFxTarget[];
  frames: FxFrameKind[];
  auras: FxAuraKind[];
  error?: string;
}

export interface SpellFxPreview extends SpellFxResult {
  key: string;
  name: string;
  school: string;
  level: number;
  description: string;
  effects: string[];
  targeting: string;
}

/** A campaign spell (book or reference) as the preview needs it; rules are re-read, so raw DB columns are fine too. */
export interface PreviewSpell {
  id: string;
  name: string;
  level: number;
  groupId: string | null;
  fx?: SpellFx | null;
  rules: SpellRules;
}

const SLOTS = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => [String(l), { max: 3, current: 3 }]));

const ARENA_STATS: Record<PreviewUnitId, Omit<Parameters<typeof previewParticipant>[0], "id" | "name" | "side">> = {
  caster: { hp: 40, maxHp: 40, level: 10, spellSlots: SLOTS },
  ally: { hp: 8, maxHp: 40 },
  fallen: { hp: 0, maxHp: 40, status: CombatStatus.DEAD },
  e1: { hp: 200, maxHp: 200 },
  e2: { hp: 200, maxHp: 200 },
};

function arena(): BattleParticipant[] {
  return PREVIEW_UNITS.map(({ id, name, side }) => previewParticipant({ id, name, side: side === "ally" ? ParticipantSide.ALLY : ParticipantSide.ENEMY, ...ARENA_STATS[id] }));
}

type TargetingOf<K extends SpellTargeting["kind"]> = Extract<SpellTargeting, { kind: K }>;

const sideIds = (t: TargetingOf<"area" | "template">) => (t.side === "ally" ? (["caster", "ally"] as const) : (["e1", "e2"] as const)).slice(0, t.maxTargets);

const TARGET_IDS: { [K in SpellTargeting["kind"]]: (t: TargetingOf<K>) => PreviewUnitId[] } = {
  self: () => ["caster"],
  ally: () => ["ally"],
  allyDead: () => ["fallen"],
  allAlliesDead: () => ["fallen"],
  allAllies: () => ["caster", "ally"],
  everyone: () => ["caster", "ally", "e1", "e2"],
  area: sideIds,
  template: sideIds,
  allEnemies: () => ["e1", "e2"],
  enemy: () => ["e1"],
};

const targetIdsFor = (t: SpellTargeting) => (TARGET_IDS[t.kind] as (t: SpellTargeting) => PreviewUnitId[])(t);

export function castableOf({ id, name, level, groupId, fx, rules }: PreviewSpell): CastableSpell {
  return { id, name, level, groupId, fx, definition: readSpellDefinition({ id, ...rules }) };
}

/** The library entry as the seeder writes it to the DB, so it previews like a campaign spell. */
export function libraryPreviewSpell(spell: LibrarySpell, fx?: SpellFx | null): PreviewSpell {
  const d = spell.definition;

  return {
    id: spell.key,
    name: spell.name,
    level: spell.level,
    groupId: null,
    fx,
    rules: { dice: d.dice, cost: d.cost, targeting: d.targeting, resolution: d.resolution, spellEffects: d.effects, stackable: d.stackable ?? false, maxStacks: d.maxStacks ?? null },
  };
}

const libraryCastable = (spell: LibrarySpell, fx?: SpellFx | null): CastableSpell => castableOf(libraryPreviewSpell(spell, fx));

/** Casts the spell on a synthetic arena (every save fails, dice roll 4) and reads off what the client would play. */
export function previewCastFx(castable: CastableSpell): SpellFxResult {
  const participants = arena();

  const targetIds = targetIdsFor(castable.definition.targeting);

  const failed = (error: string): SpellFxResult => ({ spec: null, targetIds, targets: [], frames: [], auras: [], error });

  try {
    const result = castSpell({
      caster: participants[0],
      spell: castable,
      targetIds,
      allParticipants: participants,
      currentRound: 1,
      battleId: "preview",
      diceRolls: Array.from({ length: Math.max(1, castable.definition.dice) }, () => 4),
      saveRolls: targetIds.map((participantId) => ({ participantId, roll: 1 })),
      rng: () => 0.01,
    });

    if (!result.success) return failed("заклинання не спрацювало");

    const spec = mapAction(result.battleAction)[0] ?? null;

    const hpChanged = new Set(result.battleAction.hpChanges.filter((h) => h.oldHp !== h.newHp).map((h) => h.participantId));

    const targets = PREVIEW_UNITS.flatMap(({ id }): SpellFxTarget[] => {
      const impact = hpChanged.has(id) ? impactFor(spec ?? undefined, id) : null;

      const after = result.allParticipantsUpdated.find((p) => p.basicInfo.id === id);

      const auras = after ? aurasOf(after.battleData.activeEffects ?? []) : [];

      return impact || auras.length ? [{ id, frame: impact ? frameKindOf(impact) : null, auras }] : [];
    });

    return {
      spec,
      targetIds,
      targets,
      frames: [...new Set(targets.flatMap((t) => (t.frame ? [t.frame] : [])))],
      auras: [...new Set(targets.flatMap((t) => t.auras))],
    };
  } catch (e) {
    return failed(e instanceof Error ? e.message : String(e));
  }
}

export function previewSpellFx(spell: LibrarySpell, fx?: SpellFx | null): SpellFxPreview {
  const castable = libraryCastable(spell, fx);

  return {
    key: spell.key,
    name: spell.name,
    school: spell.school,
    level: spell.level,
    description: spell.description ?? "",
    effects: [...new Set(castable.definition.effects.map(describeEffect))],
    targeting: targetingLabel(castable.definition.targeting),
    ...previewCastFx(castable),
  };
}
