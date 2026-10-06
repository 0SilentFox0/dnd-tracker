import { getProficiencyBonus } from "@/lib/utils/common/calculations";
import type { CSVUnitRow, ImportUnit, UnitAttack, UnitSpecialAbility } from "@/types/import";

/**
 * Парсить значення ability score з рядка
 * Формат: "8 (+1)" або просто "8"
 */
export function parseAbilityScore(value: string): number {
  const match = value.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 10;
}

/**
 * Парсить AC з рядка
 * Формат: "12" або "12 (natural armor)"
 */
export function parseArmorClass(value: string): number {
  const match = value.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 10;
}

/**
 * Парсить HP з рядка
 * Формат: "18 (4к6 + 4)" або просто "18"
 */
export function parseMaxHp(value: string): number {
  // Спочатку шукаємо число перед дужками
  const beforeParentheses = value.match(/^(\d+)\s*\(/);

  if (beforeParentheses) {
    return parseInt(beforeParentheses[1], 10);
  }

  // Якщо немає дужок, шукаємо перше число
  const match = value.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 10;
}

/**
 * Парсить швидкість з рядка
 * Формат: "25 фт." або "30 фт." або просто "30"
 */
export function parseSpeed(value: string): number {
  const match = value.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 30;
}

/**
 * Парсить рівень (Tier) з рядка
 */
export function parseLevel(value: string): number {
  const match = value.match(/(\d+)/);

  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Парсить атаки з рядка
 * Формат: "Укус +5, 1к6 колючий урон" або "Кігті +6, 2к6 рублячий"
 * Може бути кілька атак через кому: "Укус +5, 1к6 колючий. Кігті +6, 2к6 рублячий"
 */
export function parseAttacks(value: string): UnitAttack[] {
  if (!value || value.trim() === "Відсутні" || value.trim() === "") {
    return [];
  }

  const attacks: UnitAttack[] = [];
  
  // Розділяємо по крапках з пробілом (різні атаки) або по комах якщо це одна атака з кількома частинами
  // Спочатку пробуємо розділити по крапках
  let attackStrings = value.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
  
  // Якщо не знайшли крапок, розділяємо по комах
  if (attackStrings.length === 1 && value.includes(",")) {
    // Може бути одна атака з кількома частинами через кому
    attackStrings = [value];
  }

  for (const attackStr of attackStrings) {
    // Шукаємо назву атаки, бонус, урон та тип
    // Формат: "Назва +бонус, урон тип" або "Назва +бонус, урон"
    const bonusMatch = attackStr.match(/\+(\d+)/);

    const damageMatch = attackStr.match(/(\d+[кk]?\d+[\+\-]?\d*)/i);
    
    // Назва - все до першого "+" або до першої коми
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
    
    // Визначаємо тип урону
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

    // Нормалізуємо формат кубиків (к -> d)
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

/**
 * Парсить special abilities з рядка
 */
export function parseSpecialAbilities(value: string): UnitSpecialAbility[] {
  if (!value || value.trim() === "") {
    return [];
  }

  const abilities: UnitSpecialAbility[] = [];
  
  // Розділяємо по крапках або нових рядках
  const abilityStrings = value
    .split(/[.;]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const abilityStr of abilityStrings) {
    // Шукаємо назву та опис
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
      // Якщо немає двокрапки, весь рядок - це опис
      abilities.push({
        name: abilityStr.substring(0, 50) + (abilityStr.length > 50 ? "..." : ""),
        description: abilityStr,
        type: "passive",
      });
    }
  }

  return abilities;
}

/**
 * Конвертує CSV рядок юніта в формат для імпорту
 */
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
