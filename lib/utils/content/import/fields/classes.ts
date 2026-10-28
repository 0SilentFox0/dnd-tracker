import { ABILITY_ENUM, jsonField, nameField, recordLabels, textField } from "./common";

import { CLASS_CASTER_LABELS, CLASS_CASTERS } from "@/lib/constants/classes";
import type { ImportSpec } from "@/types/content-import";

export const CLASSES_IMPORT: ImportSpec = {
  kind: "classes",
  label: "Класи",
  fields: [
    nameField(["Воїн", "Чарівник"]),
    textField("icon", "Іконка", ["icon"]),
    textField("color", "Колір", ["color"], ["#8b0000", "#1e3a8a"]),
    { key: "hitDie", label: "Кістка хітів", aliases: ["hit die", "hd", "кістка"], type: "int", examples: ["10", "6"] },
    { key: "savingThrows", label: "Рятівні кидки", aliases: ["saving throws", "saves"], type: "list", ...ABILITY_ENUM, examples: ["strength, constitution", "intelligence, wisdom"] },
    jsonField("proficiencies", "Майстерності (JSON)", ["proficiencies"], ['{"armor":["усі обладунки","щити"],"weapons":["прості","бойові"],"tools":[]}', '{"armor":[],"weapons":["кинджали"],"tools":[]}']),
    jsonField("skillChoices", "Вибір навичок (JSON)", ["skill choices"], ['{"count":2,"from":["athletics","perception"]}', '{"count":2,"from":["arcana","history"]}']),
    { key: "caster", label: "Тип заклинача", aliases: ["caster", "заклинач"], type: "enum", enumValues: CLASS_CASTERS, enumLabels: recordLabels(CLASS_CASTER_LABELS), examples: ["Не заклинач", "Повний заклинач"] },
    { key: "spellcastingAbility", label: "Характеристика заклинань", aliases: ["spellcasting ability"], type: "enum", ...ABILITY_ENUM, examples: ["", "intelligence"] },
    jsonField("features", "Вміння за рівнями (JSON)", ["features", "вміння"], ["[]", "[]"]),
    { key: "subclassLevel", label: "Рівень підкласу", aliases: ["subclass level"], type: "int", examples: ["3", "2"] },
    jsonField("subclasses", "Підкласи (JSON)", ["subclasses"], ["[]", "[]"]),
    jsonField("columns", "Таблиця класу (JSON)", ["columns", "class table"], ["[]", "[]"]),
    textField("spellList", "Список заклинань", ["spell list", "список заклинань"], ["", "Wizard"]),
  ],
};
