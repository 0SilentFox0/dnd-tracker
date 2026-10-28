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
import { parseWeaponTraits } from "@/lib/constants/weapon-traits";
import { prisma } from "@/lib/db";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

// 5e: безоружний удар = 1 + Сил (плоска «1»)
// Без зброї свого виду герой б'є лише кубиками рівня — так само рахує баланс (bestAttack у balance/stats.ts)
const defaultAttacks = (names: Ruleset["defaultAttacks"], fiveE: boolean): ExtractedAttack[] => [
  { id: "default-melee", name: names.meleeName, type: AttackType.MELEE as ExtractedAttack["type"], attackBonus: 0, damageDice: fiveE ? "1" : "", damageType: "physical" },
  { id: "default-ranged", name: names.rangedName, type: AttackType.RANGED as ExtractedAttack["type"], attackBonus: 0, damageDice: "", damageType: "physical" },
];

export async function extractAttacksFromCharacter(
  character: CharacterFromPrisma,
  preloadedArtifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>,
  names: Ruleset["defaultAttacks"] = DEFAULT_RULES.defaultAttacks,
  opts: { fiveE?: boolean } = {},
): Promise<ExtractedAttack[]> {
  const weapons = await extractWeaponAttacks(character, preloadedArtifactsById, !!opts.fiveE);

  return [...weapons, ...defaultAttacks(names, !!opts.fiveE).filter((d) => !weapons.some((w) => w.type === d.type))];
}

async function extractWeaponAttacks(
  character: CharacterFromPrisma,
  preloadedArtifactsById: Record<string, Prisma.ArtifactGetPayload<object>> | undefined,
  fiveE: boolean,
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
        key === "range_weapon" ||
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

  const shieldId = fiveE && typeof equipped.shield === "string" ? equipped.shield : null;

  if (shieldId) weaponIds.push(shieldId);

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

  const shieldCellEmpty = !equipped.shield;

  for (const weapon of potentialWeapons) {
    const isOffHand = shieldId !== null && weapon.id === shieldId;

    if (isOffHand && weapon.slot !== "weapon") continue;

    if (
      !isOffHand &&
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
      (attackType?.toLowerCase() === AttackType.RANGED ||
        weapon.slot === "range_weapon" ||
        (rangeVal && rangeVal.trim() !== "" && rangeVal !== "5 ft"))
    ) {
      attackType = AttackType.RANGED;
    }

    const traits = fiveE ? parseWeaponTraits(getOptionalModifierValue(modifiers, ArtifactModifierType.TRAITS)) : [];

    const versatileDice = fiveE ? getOptionalModifierValue(modifiers, ArtifactModifierType.VERSATILE_DICE) : undefined;

    const thrownMelee = traits.includes("thrown");

    const useVersatile = fiveE && !isOffHand && traits.includes("versatile") && !!versatileDice && shieldCellEmpty;

    attacks.push({
      id: isOffHand ? `${weapon.id}:off` : weapon.id,
      name: weapon.name,
      type: (attackType === AttackType.RANGED && !thrownMelee
        ? AttackType.RANGED
        : AttackType.MELEE) as ExtractedAttack["type"],
      attackBonus,
      damageDice: useVersatile ? versatileDice : damageDice,
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
      ...(traits.length > 0 && { traits }),
      ...(versatileDice && { versatileDice }),
      ...(isOffHand && { hand: "off" as const }),
    });
  }

  return attacks;
}
