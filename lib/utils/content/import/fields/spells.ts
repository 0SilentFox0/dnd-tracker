import { jsonField, nameField, textField } from "./common";

import { SPELL_COSTS } from "@/lib/utils/spells/model/schema";
import type { ImportField, ImportSpec } from "@/types/content-import";

const fields: ImportField[] = [
  nameField(["Вогняна куля", "Лікування ран"]),
  { key: "level", label: "Коло", aliases: ["рівень", "круг", "level"], type: "int", numberWords: { cantrip: 0, замовляння: 0, заговір: 0, "заговір (0)": 0 }, examples: ["3", "1"] },
  { key: "groupId", label: "Школа", aliases: ["школа магії", "school", "група", "group"], type: "ref", ref: "spell-groups", examples: ["", ""] },
  textField("description", "Опис", ["description"], ["Вибух полум'я радіусом 20 футів", "Відновлює хіти дотиком"]),
  textField("appearanceDescription", "Опис вигляду", ["appearance"]),
  textField("icon", "Іконка", ["icon"]),
  { key: "cost", label: "Вартість", aliases: ["дія", "casting time", "час накладання"], type: "enum", enumValues: SPELL_COSTS, enumLabels: { action: ["Дія", "1 дія", "action", "1 action", "дією"], bonusAction: ["Бонусна дія", "bonus action", "1 bonus action", "бонус", "бонусною дією", "1 бонусна дія"] }, examples: ["Дія", "Бонусна дія"] },
  { key: "dice", label: "Кістки", aliases: ["кубики", "damage", "шкода"], type: "dice", examples: ["8d6", "1d8"] },
  { key: "dieSides", label: "Грань кубика", aliases: ["die", "грань"], type: "int", examples: ["", ""] },
  { key: "concentration", label: "Концентрація", aliases: [], type: "bool", examples: ["ні", "ні"] },
  { key: "stackable", label: "Стакається", aliases: [], type: "bool", examples: ["ні", "ні"] },
  { key: "maxStacks", label: "Макс. стаків", aliases: [], type: "int", examples: ["", ""] },
  { key: "upcastDice", label: "Кістки за коло", aliases: ["upcast"], type: "int", examples: ["1", "1"] },
  { key: "upcastTargets", label: "Цілі за коло", aliases: [], type: "int", examples: ["", ""] },
  { key: "addAbilityMod", label: "Додавати модифікатор", aliases: [], type: "bool", examples: ["ні", "так"] },
  jsonField("targeting", "Ціль (JSON)", ["ціль", "target"], ['{"kind":"template","shape":"circle","size":20,"side":"enemy","maxTargets":6}', '{"kind":"ally","range":5}']),
  jsonField("resolution", "Кидок (JSON)", ["кидок"], ['{"kind":"save","ability":"dexterity","onSuccess":"half"}', '{"kind":"auto"}']),
  jsonField("spellEffects", "Ефекти (JSON)", ["ефекти", "effects"], ["[]", "[]"]),
  jsonField("raceModifiers", "Модифікатори рас (JSON)", []),
  jsonField("fx", "Візуальний ефект (JSON)", []),
  { key: "lists", label: "Списки", aliases: ["lists", "списки", "spell lists"], type: "list", examples: ["Wizard, Sorcerer", "Cleric"] },
];

const DICE = /^(\d*)d(\d+)/;

export const SPELLS_IMPORT: ImportSpec = {
  kind: "spells",
  label: "Заклинання",
  fields,
  toBody: (record) => {
    const m = typeof record.dice === "string" ? DICE.exec(record.dice) : null;

    if (!m) return record;

    return { ...record, dice: Number(m[1] || 1), ...(record.dieSides === undefined && { dieSides: Number(m[2]) }) };
  },
};
