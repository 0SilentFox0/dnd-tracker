/**
 * Допоміжні функції для balance API: модифікатори артефактів, атаки персонажа, прогрес скілів
 */

import { ArtifactModifierType } from "@/lib/constants/artifacts";
import { AttackType } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { type ArtifactModifier, getModifierValue, getOptionalModifierValue } from "@/lib/utils/battle/participant/artifact-utils";

export async function getCharacterAttacks(
  characterId: string,
  campaignId: string,
): Promise<Array<{ damageDice: string; type: string }>> {
  const character = await prisma.character.findUnique({
    where: { id: characterId, campaignId },
    include: { inventory: true },
  });

  if (!character?.inventory) return [];

  const equipped =
    (character.inventory.equipped as Record<string, string | unknown>) || {};

  const weaponSlots = ["mainHand", "offHand", "weapon", "weapon1", "weapon2"];

  const weaponIds: string[] = [];

  const inlineAttacks: Array<{ damageDice: string; type: string }> = [];

  for (const key of weaponSlots) {
    const val = equipped[key];

    if (!val) continue;

    if (typeof val === "string") {
      weaponIds.push(val);
    } else if (typeof val === "object" && val !== null && "damageDice" in val) {
      const v = val as { damageDice?: string; weaponType?: string };

      inlineAttacks.push({
        damageDice: (v.damageDice as string) || "1d6",
        type:
          (v.weaponType as string) === AttackType.RANGED
            ? AttackType.RANGED
            : AttackType.MELEE,
      });
    }
  }

  if (weaponIds.length === 0) return inlineAttacks;

  const artifacts = await prisma.artifact.findMany({
    where: { id: { in: weaponIds }, campaignId },
  });

  for (const art of artifacts) {
    if (
      art.slot !== "weapon" &&
      art.slot !== "mainHand" &&
      art.slot !== "offHand"
    )
      continue;

    const modifiers = (art.modifiers as ArtifactModifier[]) || [];

    const damageDice =
      getOptionalModifierValue(modifiers, ArtifactModifierType.DAMAGE_DICE) ??
      "";

    const attackType = getModifierValue(
      modifiers,
      ArtifactModifierType.ATTACK_TYPE,
      AttackType.MELEE,
    );

    inlineAttacks.push({ damageDice, type: attackType });
  }

  return inlineAttacks;
}
