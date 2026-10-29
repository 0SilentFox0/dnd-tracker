/* eslint-disable no-restricted-syntax -- Ukrainian CSV import keywords (data format, not UI text) */
import { AttackType } from "@/lib/constants/battle";
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
  if (!value || value.trim() === "Відсутні" || value.trim() === "") {
    return [];
  }

  const attacks: UnitAttack[] = [];
  
  let attackStrings = value.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
  
  if (attackStrings.length === 1 && value.includes(",")) {
    attackStrings = [value];
  }

  for (const attackStr of attackStrings) {
    const bonusMatch = attackStr.match(/\+(\d+)/);

    const damageMatch = attackStr.match(/(\d+[кk]?\d+[\+\-]?\d*)/i);
    
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

    if (lowerStr.includes("колючий") || lowerStr.includes("piercing")) {
      damageType = "piercing";
    } else if (lowerStr.includes("рублячий") || lowerStr.includes("slashing")) {
      damageType = "slashing";
    } else if (lowerStr.includes("дроблячий") || lowerStr.includes("bludgeoning")) {
      damageType = "bludgeoning";
    } else if (lowerStr.includes("полум'я") || lowerStr.includes("fire") || lowerStr.includes("полумя")) {
      damageType = "fire";
    } else if (lowerStr.includes("холод") || lowerStr.includes("cold")) {
      damageType = "cold";
    }

    const damageDice = damageMatch ? damageMatch[1].replace(/к/g, "d").replace(/k/g, "d") : "1d4";

    attacks.push({
      name,
      attackBonus,
      damageType,
      damageDice,
    });
  }

  return attacks;
}

const NAMED_DICE = /^(.+?)[_\s]+(\d+[dкk]\d+(?:\s*[+-]\s*\d+)?)$/i;

const RANGED_NAME = /ranged|range|shot|bow/i;

const LEGACY_DAMAGE = /\d+[кk]?\d+/i;

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

export function convertCSVRowToUnit(row: CSVUnitRow): ImportUnit {
  const name = (row.Назва || row.name || row.Name || "").trim();

  const tier = parseLevel(row.Tier || row.tier || "1");

  const initiativeRaw = (row.Initiative ?? row.initiative ?? "").trim();

  const initiative = initiativeRaw ? parseInt(initiativeRaw, 10) : 10;

  const avatar = (row.Image ?? row.image ?? row.URL ?? "").trim() || undefined;

  const raceName = (row.Група || row.group || row.Group || "").trim() || undefined;

  const features = row.Особливості || row.features || row.Features;

  return {
    name,
    level: tier,
    strength: parseAbilityScore(row.СИЛ || row.str || row.STR || "10"),
    dexterity: parseAbilityScore(row.ЛОВ || row.dex || row.DEX || "10"),
    constitution: parseAbilityScore(row.ТІЛ || row.con || row.CON || "10"),
    intelligence: parseAbilityScore(row.ІНТ || row.int || row.INT || "10"),
    wisdom: parseAbilityScore(row.МДР || row.wis || row.WIS || "10"),
    charisma: parseAbilityScore(row.ХАР || row.cha || row.CHA || "10"),
    armorClass: parseArmorClass(row.КД || row.ac || row.AC || "10"),
    initiative: Number.isNaN(initiative) ? 10 : initiative,
    speed: parseSpeed(row.Швидкість || row.speed || row.Speed || "30"),
    maxHp: parseMaxHp(row.ХП || row.hp || row.HP || "10"),
    proficiencyBonus: getProficiencyBonus(tier),
    attacks: parseAttacks(row.Атаки || row.attacks || row.Attacks || ""),
    specialAbilities: parseSpecialAbilities((row["Навички/Здібності"] || row.abilities || row.Abilities || "") + (features ? ". " + features : "")),
    knownSpells: [],
    ...(avatar && { avatar }),
    ...(raceName && { raceName }),
  };
}
