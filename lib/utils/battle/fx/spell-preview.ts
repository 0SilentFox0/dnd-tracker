import type { FxAuraKind } from "./aura";
import { aurasOf } from "./aura";
import { frameKindOf, type FxFrameKind } from "./frame-kind";
import { impactFor } from "./impact";
import { mapAction } from "./map-action";
import { previewParticipant } from "./preview-participant";
import { effectLabel, targetingLabel } from "./spell-labels";
import type { FxSpec } from "./types";

import type { LibrarySpell } from "@/data/library/types";
import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import type { SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

export type PreviewUnitId = "caster" | "ally" | "fallen" | "e1" | "e2";

export interface PreviewUnit {
  id: PreviewUnitId;
  name: string;
  side: "ally" | "enemy";
}

export const PREVIEW_UNITS: readonly PreviewUnit[] = [
  { id: "caster", name: "Чарівниця", side: "ally" },
  { id: "ally", name: "Воїн", side: "ally" },
  { id: "fallen", name: "Полеглий", side: "ally" },
  { id: "e1", name: "Огр", side: "enemy" },
  { id: "e2", name: "Лич", side: "enemy" },
];

export interface SpellFxTarget {
  id: string;
  frame: FxFrameKind | null;
  auras: FxAuraKind[];
}

export interface SpellFxPreview {
  key: string;
  name: string;
  school: string;
  level: number;
  description: string;
  effects: string[];
  targeting: string;
  spec: FxSpec | null;
  /** Arena units the cast changed: hit frame (HP changed) and auras after the cast. */
  targets: SpellFxTarget[];
  frames: FxFrameKind[];
  auras: FxAuraKind[];
  error?: string;
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

function targetIdsFor(t: SpellTargeting): string[] {
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
      return (t.side === "ally" ? ["caster", "ally"] : ["e1", "e2"]).slice(0, t.maxTargets);
    case "allEnemies":
      return ["e1", "e2"];
    case "enemy":
      return ["e1"];
  }
}

/** Builds the castable spell from the library entry the way the seeder writes and the engine reads a DB row. */
export function libraryCastable(spell: LibrarySpell): CastableSpell {
  const d = spell.definition;

  const definition = readSpellDefinition({
    id: spell.key,
    dice: d.dice,
    cost: d.cost,
    targeting: d.targeting,
    resolution: d.resolution,
    spellEffects: d.effects,
    raceModifiers: [],
    stackable: d.stackable ?? false,
    maxStacks: d.maxStacks ?? null,
  });

  return { id: spell.key, name: spell.name, level: spell.level, groupId: null, definition };
}

/** Casts the library spell on a synthetic arena (every save fails, dice roll 4) and reads off what the client would play. */
export function previewSpellFx(spell: LibrarySpell): SpellFxPreview {
  const castable = libraryCastable(spell);

  const base = {
    key: spell.key,
    name: spell.name,
    school: spell.school,
    level: spell.level,
    description: spell.description ?? "",
    effects: [...new Set(castable.definition.effects.map(effectLabel))],
    targeting: targetingLabel(castable.definition.targeting),
  };

  const participants = arena();

  const targetIds = targetIdsFor(castable.definition.targeting);

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

    if (!result.success) return { ...base, spec: null, targets: [], frames: [], auras: [], error: "заклинання не спрацювало" };

    const spec = mapAction(result.battleAction)[0] ?? null;

    const hpChanged = new Set(result.battleAction.hpChanges.filter((h) => h.oldHp !== h.newHp).map((h) => h.participantId));

    const targets = PREVIEW_UNITS.flatMap(({ id }): SpellFxTarget[] => {
      const impact = hpChanged.has(id) ? impactFor(spec ?? undefined, id) : null;

      const after = result.allParticipantsUpdated.find((p) => p.basicInfo.id === id);

      const auras = after ? aurasOf(after.battleData.activeEffects ?? []) : [];

      return impact || auras.length ? [{ id, frame: impact ? frameKindOf(impact) : null, auras }] : [];
    });

    return {
      ...base,
      spec,
      targets,
      frames: [...new Set(targets.flatMap((t) => (t.frame ? [t.frame] : [])))],
      auras: [...new Set(targets.flatMap((t) => t.auras))],
    };
  } catch (e) {
    return { ...base, spec: null, targets: [], frames: [], auras: [], error: e instanceof Error ? e.message : String(e) };
  }
}
