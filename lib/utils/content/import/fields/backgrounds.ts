import { jsonField, nameField, textField } from "./common";

import type { ImportSpec } from "@/types/content-import";

export const BACKGROUNDS_IMPORT: ImportSpec = {
  kind: "backgrounds", label: "Передісторії",
  fields: [
    nameField(["Sage", "Soldier"]),
    textField("icon", "Іконка", ["icon"]),
    textField("description", "Опис", ["description", "опис"]),
    { ...jsonField("choices", "Вибори (JSON)", ["choices", "вибори"]), nestedRef: { kind: "spells", key: "spellId" } },
    { key: "originFeatId", label: "Риса походження", type: "ref", ref: "feats", strictRef: true, aliases: ["originFeatId", "originFeat", "риса походження"], examples: ["", ""] },
    jsonField("skillProficiencies", "Навички (JSON)", ["skillProficiencies", "навички"], ['["arcana","history"]', '["athletics","intimidation"]']),
    jsonField("toolProficiencies", "Інструменти (JSON)", ["toolProficiencies", "інструменти"]),
    textField("equipmentText", "Спорядження (видає ДМ)", ["equipmentText", "спорядження"]),
  ],
};
