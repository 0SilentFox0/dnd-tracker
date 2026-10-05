import { SpellType } from "@/lib/constants/spell-abilities";
import {
  determineConcentration,
  determineSavingThrowAbility,
  determineSavingThrowOnSuccess,
  determineSpellDamageType,
  determineSpellType,
  extractDamageDice,
  normalizeSchoolName,
} from "@/lib/utils/spells/spell-parsing";
import type { CSVSpellRow, ImportSpell } from "@/types/import";

export function csvRowToImportSpell(row: CSVSpellRow): ImportSpell {
  const level = parseInt(row.Level || row.level || "0", 10) || 0;

  const effect = (row.Effect || row.effect || "").trim();

  const type = determineSpellType(effect);

  const damageType = determineSpellDamageType(effect);

  const damageDice = extractDamageDice(effect);

  const savingThrowAbility = determineSavingThrowAbility(effect);

  const savingThrowOnSuccess = savingThrowAbility
    ? determineSavingThrowOnSuccess(effect)
    : undefined;

  const concentration = determineConcentration(effect);

  const schoolName = (row.School || row.school || "").trim();

  const school = schoolName ? normalizeSchoolName(schoolName) : undefined;

  return {
    name: (row["UA Name"] || row.name || row.Name || "").trim(),
    level,
    school,
    type,
    damageType,
    castingTime: "1 action",
    range: type === SpellType.AOE ? "60 feet" : "Touch",
    components: "V, S",
    duration: concentration
      ? "Concentration, up to 1 minute"
      : "Instantaneous",
    concentration,
    damageDice,
    savingThrowAbility,
    savingThrowOnSuccess,
    description: `${row["Original Name"] || row.originalName || ""} (${
      row["UA Name"] || row.name || ""
    }): ${effect}`,
    groupId: undefined,
  };
}
