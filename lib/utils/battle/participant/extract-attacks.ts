/**
 * Витягування атак з екіпірованої зброї (артефактів)
 */

import type { Prisma } from "@prisma/client";

import type {
  CharacterFromPrisma,
  ExtractedAttack,
} from "../types/participant";
import {
  type ArtifactModifier,
  ArtifactModifierType,
  DEFAULT_ARTIFACT_MODIFIERS,
  getModifierValue,
  getOptionalModifierValue,
} from "./artifact-utils";

import { AttackType } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";

/**
 * Витягує атаки з екіпірованої зброї (артефактів зі слота weapon)
 */
export async function extractAttacksFromCharacter(
  character: CharacterFromPrisma,
  preloadedArtifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>,
): Promise<ExtractedAttack[]> {
  const attacks: ExtractedAttack[] = [];

  if (!character.inventory) {
    return attacks;
  }

  const equipped =
    (character.inventory.equipped as Record<
      string,
      string | Record<string, unknown>
    >) || {};

  const slotKeys = [
    "mainHand",
    "offHand",
    "weapon",
    "weapon1",
    "weapon2",
    "range_weapon",
  ] as const;

  const weaponIds: string[] = [];

  for (const key of slotKeys) {
    const val = equipped[key];

    if (!val) continue;

    if (typeof val === "string") {
      weaponIds.push(val);
    } else if (typeof val === "object" && val !== null && "damageDice" in val) {
      const inv = val as {
        id?: string;
        name?: string;
        attackBonus?: number;
        damageDice?: string;
        damageType?: string;
        weaponType?: string;
        range?: string;
      };

      const isRanged =
        inv.weaponType?.toLowerCase() === AttackType.RANGED ||
        /лук|bow|арбалет|crossbow/i.test((inv.name as string) ?? "") ||
        (typeof inv.range === "string" &&
          inv.range.trim() !== "" &&
          inv.range !== "5 ft");

      attacks.push({
        id: inv.id ?? `inline-${key}`,
        name: (inv.name as string) ?? "Зброя",
        type: (isRanged ? AttackType.RANGED : AttackType.MELEE) as ExtractedAttack["type"],
        attackBonus: typeof inv.attackBonus === "number" ? inv.attackBonus : 0,
        damageDice: (inv.damageDice as string) ?? "1d6",
        damageType: (inv.damageType as string) ?? "bludgeoning",
        range: typeof inv.range === "string" ? inv.range : undefined,
      });
    }
  }

  if (weaponIds.length === 0 && attacks.length === 0) {
    return attacks;
  }

  if (weaponIds.length === 0) {
    return attacks;
  }

  const potentialWeapons = preloadedArtifactsById
    ? weaponIds
        .map((id) => preloadedArtifactsById[id])
        .filter((w): w is NonNullable<typeof w> => w != null)
    : await prisma.artifact.findMany({
        where: {
          id: { in: weaponIds },
          campaignId: character.campaignId,
        },
      });

  for (const weapon of potentialWeapons) {
    if (
      weapon.slot !== "weapon" &&
      weapon.slot !== "mainHand" &&
      weapon.slot !== "offHand" &&
      weapon.slot !== "range_weapon"
    ) {
      continue;
    }

    const modifiers = (weapon.modifiers as ArtifactModifier[]) || [];

    const bonuses = (weapon.bonuses as Record<string, number>) || {};

    const attackBonus = bonuses.attackBonus || bonuses.attack || 0;

    const damageDice =
      getOptionalModifierValue(modifiers, ArtifactModifierType.DAMAGE_DICE) ??
      "1d6";

    const damageType = getModifierValue(
      modifiers,
      ArtifactModifierType.DAMAGE_TYPE,
      DEFAULT_ARTIFACT_MODIFIERS.DAMAGE_TYPE,
    );

    let attackType = getModifierValue(
      modifiers,
      ArtifactModifierType.ATTACK_TYPE,
      AttackType.MELEE,
    );

    const rangeVal = getOptionalModifierValue(
      modifiers,
      ArtifactModifierType.RANGE,
    );

    if (
      attackType !== AttackType.RANGED &&
      (attackType?.toLowerCase() === "ranged" ||
        /лук|bow|арбалет|crossbow/i.test(weapon.name) ||
        (rangeVal && rangeVal.trim() !== "" && rangeVal !== "5 ft"))
    ) {
      attackType = AttackType.RANGED;
    }

    attacks.push({
      id: weapon.id,
      name: weapon.name,
      type: (attackType === AttackType.RANGED
        ? AttackType.RANGED
        : AttackType.MELEE) as ExtractedAttack["type"],
      attackBonus,
      damageDice,
      damageType,
      range: rangeVal,
      properties: getOptionalModifierValue(
        modifiers,
        ArtifactModifierType.PROPERTIES,
      ),
      minTargets:
        parseInt(
          getModifierValue(modifiers, ArtifactModifierType.MIN_TARGETS, "0"),
        ) || undefined,
      maxTargets:
        parseInt(
          getModifierValue(modifiers, ArtifactModifierType.MAX_TARGETS, "0"),
        ) || undefined,
    });
  }

  return attacks;
}
