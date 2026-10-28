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

import { WEAPON_PROFICIENCY_KINDS } from "@/lib/constants/artifacts";
import { AttackType } from "@/lib/constants/battle";
import { parseWeaponTraits } from "@/lib/constants/weapon-traits";
import { resolveItemRow } from "@/lib/utils/items/resolve";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

// 5e: безоружний удар = 1 + Сил (плоска «1»)
// Без зброї свого виду герой б'є лише кубиками рівня — так само рахує баланс (bestAttack у balance/stats.ts)
const defaultAttacks = (names: Ruleset["defaultAttacks"], fiveE: boolean): ExtractedAttack[] => [
  { id: "default-melee", name: names.meleeName, type: AttackType.MELEE as ExtractedAttack["type"], attackBonus: 0, damageDice: fiveE ? "1" : "", damageType: "physical" },
  { id: "default-ranged", name: names.rangedName, type: AttackType.RANGED as ExtractedAttack["type"], attackBonus: 0, damageDice: "", damageType: "physical" },
];

/** The structured modifier wins; the description prefix ("Martial Melee Weapon.") is the fallback for older rows. */
export const weaponCategoryOf = (modifiers: ArtifactModifier[], description: string | null | undefined): ExtractedAttack["weaponCategory"] => {
  const field = getOptionalModifierValue(modifiers, ArtifactModifierType.WEAPON_CATEGORY);

  if ((WEAPON_PROFICIENCY_KINDS as readonly string[]).includes(field as string)) return field as "simple" | "martial";

  const m = /^\s*(simple|martial)\b/i.exec(description ?? "");

  return m ? (m[1].toLowerCase() as "simple" | "martial") : undefined;
};

export function extractAttacksFromCharacter(
  character: CharacterFromPrisma,
  artifactsById: Record<string, Prisma.ArtifactGetPayload<object>>,
  names: Ruleset["defaultAttacks"] = DEFAULT_RULES.defaultAttacks,
  opts: { fiveE?: boolean; items?: { enabled: boolean; attuned: readonly string[] } } = {},
): ExtractedAttack[] {
  const weapons = extractWeaponAttacks(character, artifactsById, !!opts.fiveE, opts.items);

  return [...weapons, ...defaultAttacks(names, !!opts.fiveE).filter((d) => !weapons.some((w) => w.type === d.type))];
}

function extractWeaponAttacks(
  character: CharacterFromPrisma,
  rowsById: Record<string, Prisma.ArtifactGetPayload<object>>,
  fiveE: boolean,
  items?: { enabled: boolean; attuned: readonly string[] },
): ExtractedAttack[] {
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

  const entries: Array<{ ref: string; offHand: boolean }> = [];

  for (const key of slotKeys) {
    const val = equipped[key];

    if (!val) continue;

    if (typeof val === "string") {
      entries.push({ ref: val, offHand: false });
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

  const shieldRef = fiveE && typeof equipped.shield === "string" ? equipped.shield : null;

  if (shieldRef) entries.push({ ref: shieldRef, offHand: true });

  if (entries.length === 0) {
    return attacks;
  }

  const shieldCellEmpty = !equipped.shield;

  for (const { ref, offHand: isOffHand } of entries) {
    const weapon = resolveItemRow(ref, rowsById, { itemsEnabled: !!items?.enabled, attuned: items?.attuned ?? [] });

    if (!weapon) continue;

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

    const damageBonus = Number(getOptionalModifierValue(modifiers, ArtifactModifierType.DAMAGE_BONUS) ?? 0) || 0;

    const category = weaponCategoryOf(modifiers, weapon.description);

    attacks.push({
      id: isOffHand ? `${ref}:off` : ref,
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
      ...(damageBonus !== 0 && { damageBonus }),
      ...(fiveE && category && { weaponCategory: category }),
    });
  }

  return attacks;
}
