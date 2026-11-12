import { getAbilityModifier } from "@/lib/utils/common/calculations";
import type { ParticipantPart, UnitPartRow } from "@/lib/utils/rules/systems/types";
import { isMonster5e, monsterSaveDc } from "@/lib/utils/units/monster";
import type { Unit } from "@/types/units";

export const d20UnitSpellDc: ParticipantPart<UnitPartRow> = (p, { row, rules }) => {
  const { saveDcBase } = rules.formulas;

  const config = (row.spellcasting ?? {}) as Partial<NonNullable<Unit["spellcasting"]>>;

  const spellSaveDC = isMonster5e(row)
    ? (config.dc ?? (config.ability ? saveDcBase + row.proficiencyBonus + getAbilityModifier(row[config.ability]) : monsterSaveDc(saveDcBase, row.proficiencyBonus, row)))
    : saveDcBase + row.proficiencyBonus + row.level;

  return { ...p, spellcasting: { ...p.spellcasting, spellSaveDC } };
};
