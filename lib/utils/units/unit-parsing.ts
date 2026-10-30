import { AttackType } from "@/lib/constants/battle";
import { LEGACY_DAMAGE_KEYWORDS, LEGACY_DICE_LETTERS, LEGACY_NO_ATTACKS, LEGACY_UNIT_COLUMNS } from "@/lib/constants/import-aliases";
import { getProficiencyBonus } from "@/lib/utils/common/calculations";
import { normalizeDiceText } from "@/lib/utils/common/dice";
import type { CSVUnitRow, ImportUnit, UnitSpecialAbility } from "@/types/import";
import type { UnitAttack } from "@/types/units";

// "8 (+1)" або "8"
export function parseAbilityScore(value: string): number {
  const match = value.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 10;
}

// "12" або "12 (natural armor)"
export function parseArmorClass(value: string): number {
  const match = value.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 10;
}

// "18 (4к6 + 4)" або "18"
export function parseMaxHp(value: string): number {
  const beforeParentheses = value.match(/^(\d+)\s*\(/);

  if (beforeParentheses) {
    return parseInt(beforeParentheses[1], 10);
  }

  const match = value.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 10;
}

export function parseSpeed(value: string): number {
  const match = value.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 30;
}

export function parseLevel(value: string): number {
  const match = value.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 1;
}

// "Укус +5, 1к6 колючий. Кігті +6, 2к6 рублячий" — атаки через крапку
function parseLegacyAttacks(value: string): UnitAttack[] {
  if (!value || value.trim() === LEGACY_NO_ATTACKS || value.trim() === "") {
    return [];
  }

  const attacks: UnitAttack[] = [];
  
  let attackStrings = value.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
  
  if (attackStrings.length === 1 && value.includes(",")) {
    attackStrings = [value];
  }

  for (const attackStr of attackStrings) {
    const bonusMatch = attackStr.match(/\+(\d+)/);

    const damageMatch = attackStr.match(LEGACY_DAMAGE_DICE);
    
    let name = "";

    const plusIndex = attackStr.indexOf("+");

    const commaIndex = attackStr.indexOf(",");
    
    if (plusIndex > 0) {
      name = attackStr.substring(0, plusIndex).trim();
    } else if (commaIndex > 0) {
      name = attackStr.substring(0, commaIndex).trim();
    } else {
      name = attackStr.trim();
    }

    if (!name) continue;

    const attackBonus = bonusMatch ? parseInt(bonusMatch[1], 10) : 0;
    
    let damageType = "bludgeoning";

    const lowerStr = attackStr.toLowerCase();

    damageType = LEGACY_DAMAGE_KEYWORDS.find(([, words]) => words.some((word) => lowerStr.includes(word)))?.[0] ?? damageType;

    const damageDice = damageMatch ? damageMatch[1].replace(DICE_LETTER_G, "d") : "1d4";

    attacks.push({
      name,
      attackBonus,
      damageType,
      damageDice,
    });
  }

  return attacks;
}

const DICE_LETTER_G = new RegExp(`[${LEGACY_DICE_LETTERS}]`, "g");

const LEGACY_DAMAGE_DICE = new RegExp(`(\\d+[${LEGACY_DICE_LETTERS}]?\\d+[+-]?\\d*)`, "i");

const NAMED_DICE = new RegExp(`^(.+?)[_\\s]+(\\d+[d${LEGACY_DICE_LETTERS}]\\d+(?:\\s*[+-]\\s*\\d+)?)$`, "i");

const RANGED_NAME = /ranged|range|shot|bow/i;

const LEGACY_DAMAGE = new RegExp(`\\d+[${LEGACY_DICE_LETTERS}]?\\d+`, "i");

// "Name_1d12+2|Name2 1d4" (| ; newline) or the legacy Ukrainian text; parts that fit neither land in `unparsed`
export function parseAttacksDetailed(value: string): { attacks: UnitAttack[]; unparsed: string[] } {
  const parts = value.split(/[|;\n]/).map((s) => s.trim()).filter(Boolean);

  if (parts.length <= 1 && !NAMED_DICE.test(parts[0] ?? "")) return { attacks: parseLegacyAttacks(value), unparsed: [] };

  const attacks: UnitAttack[] = [];

  const unparsed: string[] = [];

  for (const part of parts) {
    const named = NAMED_DICE.exec(part);

    if (named) {
      const damageDice = normalizeDiceText(named[2]);

      attacks.push({
        name: named[1].trim(),
        type: RANGED_NAME.test(named[1]) ? AttackType.RANGED : AttackType.MELEE,
        attackBonus: 0,
        damageType: parseLegacyAttacks(part)[0]?.damageType ?? "bludgeoning",
        damageDice,
      });
    } else if (LEGACY_DAMAGE.test(part)) attacks.push(...parseLegacyAttacks(part));
    else unparsed.push(part);
  }

  return { attacks, unparsed };
}

export const parseAttacks = (value: string): UnitAttack[] => parseAttacksDetailed(value).attacks;

export function parseSpecialAbilities(value: string): UnitSpecialAbility[] {
  if (!value || value.trim() === "") {
    return [];
  }

  const abilities: UnitSpecialAbility[] = [];
  
  const abilityStrings = value
    .split(/[.;]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const abilityStr of abilityStrings) {
    const colonIndex = abilityStr.indexOf(":");

    if (colonIndex > 0) {
      const name = abilityStr.substring(0, colonIndex).trim();

      const description = abilityStr.substring(colonIndex + 1).trim();
      
      abilities.push({
        name,
        description,
        type: "passive",
      });
    } else {
      abilities.push({
        name: abilityStr.substring(0, 50) + (abilityStr.length > 50 ? "..." : ""),
        description: abilityStr,
        type: "passive",
      });
    }
  }

  return abilities;
}

export function convertCSVRowsToUnits(rows: CSVUnitRow[]): ImportUnit[] {
  return rows.map(convertCSVRowToUnit).filter((unit) => unit.name !== "");
}

const column = (row: CSVUnitRow, keys: readonly string[]): string | undefined => keys.map((key) => row[key]).find(Boolean);

export function convertCSVRowToUnit(row: CSVUnitRow): ImportUnit {
  const col = LEGACY_UNIT_COLUMNS;

  const name = (column(row, col.name) ?? "").trim();

  const tier = parseLevel(column(row, col.tier) ?? "1");

  const initiativeRaw = (row.Initiative ?? row.initiative ?? "").trim();

  const initiative = initiativeRaw ? parseInt(initiativeRaw, 10) : 10;

  const avatar = (row.Image ?? row.image ?? row.URL ?? "").trim() || undefined;

  const raceName = (column(row, col.group) ?? "").trim() || undefined;

  const features = column(row, col.features);

  return {
    name,
    level: tier,
    strength: parseAbilityScore(column(row, col.strength) ?? "10"),
    dexterity: parseAbilityScore(column(row, col.dexterity) ?? "10"),
    constitution: parseAbilityScore(column(row, col.constitution) ?? "10"),
    intelligence: parseAbilityScore(column(row, col.intelligence) ?? "10"),
    wisdom: parseAbilityScore(column(row, col.wisdom) ?? "10"),
    charisma: parseAbilityScore(column(row, col.charisma) ?? "10"),
    armorClass: parseArmorClass(column(row, col.armorClass) ?? "10"),
    initiative: Number.isNaN(initiative) ? 10 : initiative,
    speed: parseSpeed(column(row, col.speed) ?? "30"),
    maxHp: parseMaxHp(column(row, col.maxHp) ?? "10"),
    proficiencyBonus: getProficiencyBonus(tier),
    attacks: parseAttacks(column(row, col.attacks) ?? ""),
    specialAbilities: parseSpecialAbilities((column(row, col.abilities) ?? "") + (features ? ". " + features : "")),
    knownSpells: [],
    ...(avatar && { avatar }),
    ...(raceName && { raceName }),
  };
}
