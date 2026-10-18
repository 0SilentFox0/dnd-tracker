import type { FxAuraKind } from "./aura";
import { aurasOf } from "./aura";
import { frameKindOf, type FxFrameKind } from "./frame-kind";
import { impactFor } from "./impact";
import { mapAction } from "./map-action";
import { previewParticipant } from "./preview-participant";
import { PREVIEW_UNITS, type PreviewUnitId } from "./preview-units";
import { effectLabel, targetingLabel } from "./spell-labels";
import type { FxSpec } from "./types";

import type { LibrarySpell } from "@/data/library/types";
import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import type { SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";
import type { SpellRules } from "@/types/spells";

export interface SpellFxTarget {
  id: string;
  frame: FxFrameKind | null;
  auras: FxAuraKind[];
}

export interface SpellFxResult {
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
  rules: SpellRules;
}

const SLOTS = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => [String(l), { max: 3, current: 3 }]));

function arena(): BattleParticipant[] {
  return [
    previewParticipant({ id: "caster", name: "Чарівниця", side: ParticipantSide.ALLY, hp: 40, maxHp: 40, level: 10, spellSlots: SLOTS }),
    previewParticipant({ id: "ally", name: "Воїн", side: ParticipantSide.ALLY, hp: 8, maxHp: 40 }),
    previewParticipant({ id: "fallen", name: "Полеглий", side: ParticipantSide.ALLY, hp: 0, maxHp: 40, status: CombatStatus.DEAD }),
    previewParticipant({ id: "e1", name: "Огр", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 }),
    previewParticipant({ id: "e2", name: "Лич", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 }),
  ];
}

function targetIdsFor(t: SpellTargeting): PreviewUnitId[] {
  switch (t.kind) {
    case "self":
      return ["caster"];
    case "ally":
      return ["ally"];
    case "allyDead":
    case "allAlliesDead":
      return ["fallen"];
    case "allAllies":
      return ["caster", "ally"];
    case "everyone":
      return ["caster", "ally", "e1", "e2"];
    case "area":
      return (t.side === "ally" ? (["caster", "ally"] as const) : (["e1", "e2"] as const)).slice(0, t.maxTargets);
    case "allEnemies":
      return ["e1", "e2"];
    case "enemy":
      return ["e1"];
  }
}

export function castableOf({ id, name, level, groupId, rules }: PreviewSpell): CastableSpell {
  return { id, name, level, groupId, definition: readSpellDefinition({ id, ...rules }) };
}

/** The library entry as the seeder writes it to the DB, so it previews like a campaign spell. */
export function libraryPreviewSpell(spell: LibrarySpell): PreviewSpell {
  const d = spell.definition;

  return {
    id: spell.key,
    name: spell.name,
    level: spell.level,
    groupId: null,
    rules: { dice: d.dice, cost: d.cost, targeting: d.targeting, resolution: d.resolution, spellEffects: d.effects, stackable: d.stackable ?? false, maxStacks: d.maxStacks ?? null },
  };
}

const libraryCastable = (spell: LibrarySpell): CastableSpell => castableOf(libraryPreviewSpell(spell));

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

export function previewSpellFx(spell: LibrarySpell): SpellFxPreview {
  const castable = libraryCastable(spell);

  return {
    key: spell.key,
    name: spell.name,
    school: spell.school,
    level: spell.level,
    description: spell.description ?? "",
    effects: [...new Set(castable.definition.effects.map(effectLabel))],
    targeting: targetingLabel(castable.definition.targeting),
    ...previewCastFx(castable),
  };
}
