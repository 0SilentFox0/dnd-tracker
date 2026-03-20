/**
 * Плоскі бонуси з усіх екіпірованих артефактів (стати, КБ, слоти, цілі).
 */

import {
  ARTIFACT_EFFECT_ALL_ALLIES,
  ARTIFACT_EFFECT_ALL_ENEMIES,
} from "@/lib/constants/artifact-effect-scope";
import { ArtifactModifierType } from "@/lib/constants/artifacts";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import type { BattleParticipant } from "@/types/battle";

const ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

function recomputeAbilityModifiers(p: BattleParticipant): void {
  const a = p.abilities;

  a.modifiers = {
    strength: getAbilityModifier(a.strength),
    dexterity: getAbilityModifier(a.dexterity),
    constitution: getAbilityModifier(a.constitution),
    intelligence: getAbilityModifier(a.intelligence),
    wisdom: getAbilityModifier(a.wisdom),
    charisma: getAbilityModifier(a.charisma),
  };
}

function addSpellSlots(
  participant: BattleParticipant,
  level: string,
  add: number,
): void {
  if (!add) return;

  const slot = participant.spellcasting.spellSlots[level];

  if (slot) {
    slot.max += add;
    slot.current += add;
  } else {
    participant.spellcasting.spellSlots[level] = { max: add, current: add };
  }
}

/**
 * Застосовує bonuses та min/max targets з модифікаторів кожного екіпірованого артефакта.
 * Викликати після `applyCompletedArtifactSets`, перед пасивами скілів.
 */
export function applyEquippedArtifactFlatBonuses(
  participant: BattleParticipant,
): void {
  let minTargetsBonus = 0;

  let maxTargetsBonus = 0;

  for (const artifact of participant.battleData.equippedArtifacts) {
    const aud = artifact.effectAudience;

    if (aud === ARTIFACT_EFFECT_ALL_ALLIES || aud === ARTIFACT_EFFECT_ALL_ENEMIES) {
      continue;
    }

    const b = artifact.bonuses ?? {};

    for (const k of ABILITY_KEYS) {
      const v = b[k];

      if (typeof v === "number" && v !== 0) {
        participant.abilities[k] += v;
      }
    }

    if (typeof b.armorClass === "number" && b.armorClass !== 0) {
      participant.combatStats.armorClass += b.armorClass;
    }

    if (typeof b.speed === "number" && b.speed !== 0) {
      participant.combatStats.speed += b.speed;
    }

    if (typeof b.initiative === "number" && b.initiative !== 0) {
      participant.abilities.initiative += b.initiative;
      participant.abilities.baseInitiative += b.initiative;
    }

    if (typeof b.morale === "number" && b.morale !== 0) {
      participant.combatStats.morale += b.morale;
    }

    if (typeof b.minTargets === "number") {
      minTargetsBonus += b.minTargets;
    }

    if (typeof b.maxTargets === "number") {
      maxTargetsBonus += b.maxTargets;
    }

    for (const [key, v] of Object.entries(b)) {
      const m = /^slotBonus_(\d+)$/.exec(key);

      if (m && typeof v === "number" && v !== 0) {
        addSpellSlots(participant, m[1], v);
      }
    }

    for (const modifier of artifact.modifiers) {
      const t = modifier.type;

      const raw = modifier.value;

      const n =
        typeof raw === "number" ? raw : Number.parseFloat(String(raw));

      const modVal = Number.isFinite(n) ? n : 0;

      if (t === "min_targets" || t === ArtifactModifierType.MIN_TARGETS) {
        minTargetsBonus += modVal;
      }

      if (t === "max_targets" || t === ArtifactModifierType.MAX_TARGETS) {
        maxTargetsBonus += modVal;
      }
    }
  }

  recomputeAbilityModifiers(participant);

  participant.combatStats.minTargets += minTargetsBonus;
  participant.combatStats.maxTargets += maxTargetsBonus;
}
