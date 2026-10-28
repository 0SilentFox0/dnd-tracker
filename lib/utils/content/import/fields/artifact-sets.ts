import { abilitiesField, jsonField, nameField, textField } from "./common";

import type { ImportSpec } from "@/types/content-import";

export const ARTIFACT_SETS_IMPORT: ImportSpec = {
  kind: "artifact-sets",
  label: "Сети артефактів",
  fields: [
    nameField(["Обладунки Дракона", "Регалії Мага"]),
    textField("description", "Опис", ["description"]),
    jsonField("setBonus", "Бонус сету (JSON)", ["set bonus", "бонус"], ['{"name":"Драконяча кров","description":"+2 до КД за повний комплект"}', ""]),
    abilitiesField(),
    { key: "artifactIds", label: "Артефакти", aliases: ["artifacts"], type: "refList", ref: "artifacts", examples: ["", ""] },
    textField("icon", "Іконка", ["icon"]),
  ],
};
