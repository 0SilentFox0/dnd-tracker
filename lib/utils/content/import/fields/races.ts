import { abilitiesField, jsonField, nameField, textField } from "./common";

import type { ImportSpec } from "@/types/content-import";

export const RACES_IMPORT: ImportSpec = {
  kind: "races",
  label: "Раси",
  fields: [
    nameField(["Ельфи", "Гноми"]),
    textField("icon", "Іконка", ["icon"]),
    textField("color", "Колір", ["color"], ["#2e8b57", "#b8860b"]),
    { key: "availableSkills", label: "Доступні основні скіли", aliases: ["available skills", "основні скіли"], type: "refList", ref: "main-skills", examples: ["", ""] },
    { key: "disabledSkills", label: "Заборонені скіли", aliases: ["disabled skills"], type: "refList", ref: "skills", examples: ["", ""] },
    jsonField("passiveAbility", "Пасивна здібність (JSON)", ["passive ability"], ['{"name":"Лісова стежка","description":"Швидкість +10 у лісі"}', ""]),
    jsonField("spellSlotProgression", "Слоти заклинань (JSON)", ["слоти"], ['[{"level":1,"slots":2}]', ""]),
    abilitiesField(),
  ],
};
