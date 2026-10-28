import { abilitiesField, jsonField, nameField, recordLabels, textField } from "./common";

import { FEAT_TYPE_LABELS, FEAT_TYPES } from "@/lib/constants/choices";
import type { ImportSpec } from "@/types/content-import";

export const FEATS_IMPORT: ImportSpec = {
  kind: "feats",
  label: "Риси",
  fields: [
    nameField(["Пильний", "Влучний стрілець"]),
    textField("icon", "Іконка", ["icon"]),
    { key: "type", label: "Тип", aliases: ["type", "тип"], type: "enum", enumValues: FEAT_TYPES, enumLabels: recordLabels(FEAT_TYPE_LABELS), examples: ["Походження", "Стиль бою"] },
    jsonField("prerequisite", "Передумови (JSON)", ["prerequisite", "передумова", "передумови"], ["{}", '{"level":4}']),
    { key: "repeatable", label: "Повторювана", aliases: ["repeatable"], type: "bool", examples: ["ні", "ні"] },
    textField("description", "Опис", ["description", "опис"], ["Майстерність до ініціативи", "+2 до дальніх атак"]),
    abilitiesField(),
    jsonField("choices", "Вибори (JSON)", ["choices", "вибори"], ["[]", "[]"]),
  ],
};
