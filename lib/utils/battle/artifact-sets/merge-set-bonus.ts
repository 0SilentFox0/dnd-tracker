/**
 * Злиття одного розпарсеного setBonus у BattleParticipant.
 */

import { mergeParticipantImmuneSpellIds } from "../participant/extras";
import { applyArtifactSetPassiveEffects } from "./apply-set-passive-effects";
import {
  ABILITY_KEYS_FOR_SET_BONUS,
  SET_BONUS_EQUIP_SLOT,
  SYNTHETIC_SET_BONUS_ID_PREFIX,
} from "./constants";
import { equippedArtifactToParsedBonusBundle } from "./equipped-to-parsed-bundle";
import { pushArtifactSetHudMarker } from "./push-artifact-set-hud-marker";

import {
  ARTIFACT_EFFECT_ALL_ALLIES,
  ARTIFACT_EFFECT_ALL_ENEMIES,
} from "@/lib/constants/artifact-effect-scope";
import type { ParsedArtifactSetBonus } from "@/lib/types/artifact-set-bonus";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import type {
  ArtifactSetHudMarker,
  BattleParticipant,
  EquippedArtifact,
} from "@/types/battle";

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

/**
 * Застосовує бонус без повторної черги (effectAudience вже знято або не використовується).
 */
export function applyParsedSetBonusToParticipantDirect(
  participant: BattleParticipant,
  bundle: ParsedArtifactSetBonus,
  displayName: string,
  hud?: ArtifactSetHudMarker,
): void {
  const remainingBonuses: Record<string, number> = { ...bundle.bonuses };

  for (const k of ABILITY_KEYS_FOR_SET_BONUS) {
    const v = remainingBonuses[k];

    if (typeof v === "number" && v !== 0) {
      participant.abilities[k] += v;
      delete remainingBonuses[k];
    }
  }

  recomputeAbilityModifiers(participant);

  if (
    typeof remainingBonuses.armorClass === "number" &&
    remainingBonuses.armorClass !== 0
  ) {
    participant.combatStats.armorClass += remainingBonuses.armorClass;
    delete remainingBonuses.armorClass;
  }

  if (typeof remainingBonuses.speed === "number" && remainingBonuses.speed !== 0) {
    participant.combatStats.speed += remainingBonuses.speed;
    delete remainingBonuses.speed;
  }

  if (
    typeof remainingBonuses.initiative === "number" &&
    remainingBonuses.initiative !== 0
  ) {
    participant.abilities.initiative += remainingBonuses.initiative;
    participant.abilities.baseInitiative += remainingBonuses.initiative;
    delete remainingBonuses.initiative;
  }

  if (typeof remainingBonuses.morale === "number" && remainingBonuses.morale !== 0) {
    participant.combatStats.morale += remainingBonuses.morale;
    delete remainingBonuses.morale;
  }

  const mods = bundle.modifiers ?? [];

  if (Object.keys(remainingBonuses).length > 0 || mods.length > 0) {
    const synthetic: EquippedArtifact = {
      artifactId: `${SYNTHETIC_SET_BONUS_ID_PREFIX}${displayName}`,
      name: displayName,
      slot: SET_BONUS_EQUIP_SLOT,
      bonuses: remainingBonuses,
      modifiers: mods.map((m) => ({
        type: m.type,
        value: m.value,
        isPercentage: m.isPercentage,
      })),
    };

    participant.battleData.equippedArtifacts.push(synthetic);
  }

  for (const [lvl, add] of Object.entries(bundle.spellSlotBonus)) {
    if (!add) continue;

    const slot = participant.spellcasting.spellSlots[lvl];

    if (slot) {
      slot.max += add;
      slot.current += add;
    } else {
      participant.spellcasting.spellSlots[lvl] = { max: add, current: add };
    }
  }

  applyArtifactSetPassiveEffects(participant, bundle.passiveEffects ?? []);
  mergeParticipantImmuneSpellIds(participant, bundle.immuneSpellIds);

  if (hud) pushArtifactSetHudMarker(participant, hud);
}

export function mergeArtifactSetBonusIntoParticipant(
  participant: BattleParticipant,
  bundle: ParsedArtifactSetBonus,
  displayName: string,
  hud?: ArtifactSetHudMarker,
): void {
  const aud = bundle.effectAudience;

  if (aud === ARTIFACT_EFFECT_ALL_ALLIES || aud === ARTIFACT_EFFECT_ALL_ENEMIES) {
    participant.battleData.pendingScopedArtifactBonuses ??= [];
    participant.battleData.pendingScopedArtifactBonuses.push({
      sourceSide: participant.basicInfo.side,
      audience: aud,
      bundle,
      displayName,
      hud,
    });

    if (hud) pushArtifactSetHudMarker(participant, hud);

    return;
  }

  applyParsedSetBonusToParticipantDirect(participant, bundle, displayName, hud);
}

/** Чергає пасив/плоскі бонуси артефакта з аудиторією команда/вороги. */
export function enqueueScopedBonusFromEquippedIfNeeded(
  participant: BattleParticipant,
  artifact: EquippedArtifact,
): void {
  if (artifact.artifactId.startsWith(SYNTHETIC_SET_BONUS_ID_PREFIX)) {
    return;
  }

  const aud = artifact.effectAudience;

  if (aud !== ARTIFACT_EFFECT_ALL_ALLIES && aud !== ARTIFACT_EFFECT_ALL_ENEMIES) {
    return;
  }

  const bundle = equippedArtifactToParsedBonusBundle(artifact);

  participant.battleData.pendingScopedArtifactBonuses ??= [];
  participant.battleData.pendingScopedArtifactBonuses.push({
    sourceSide: participant.basicInfo.side,
    audience: aud,
    bundle,
    displayName: artifact.name,
  });
}
