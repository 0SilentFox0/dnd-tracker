import { abilitiesField, jsonField, nameField, optionLabels, textField } from "./common";

import { ARTIFACT_RARITY_OPTIONS, ARTIFACT_RARITY_VALUES, ARTIFACT_SLOT_OPTIONS, ARTIFACT_SLOT_VALUES } from "@/lib/constants/artifacts";
import type { ImportSpec } from "@/types/content-import";

export const ARTIFACTS_IMPORT: ImportSpec = {
  kind: "artifacts",
  label: "Артефакти",
  fields: [
    nameField(["Меч Дракона", "Кільце захисту"]),
    textField("description", "Опис", ["description"], ["Старовинний меч", "+1 до КД"]),
    { key: "rarity", label: "Рідкість", aliases: ["rarity"], type: "enum", enumValues: ARTIFACT_RARITY_VALUES, enumLabels: optionLabels(ARTIFACT_RARITY_OPTIONS), examples: ["Рідкісний", "Незвичайний"] },
    { key: "slot", label: "Слот", aliases: ["slot", "тип"], type: "enum", required: true, enumValues: ARTIFACT_SLOT_VALUES, enumLabels: optionLabels(ARTIFACT_SLOT_OPTIONS), examples: ["Зброя", "Кільце"] },
    { key: "setId", label: "Сет", aliases: ["set", "комплект"], type: "ref", ref: "artifact-sets", examples: ["", ""] },
    textField("icon", "Іконка", ["icon"]),
    jsonField("weapon", "Зброя (JSON)", ["weapon"], ['{"damageDice":"1d8","damageType":"slashing","attackType":"melee"}', ""]),
    jsonField("armor", "Броня (JSON)", ["armor"]),
    { ...jsonField("item", "Предмет 5e (JSON)", ["item"], ['{"unique":false}', '{"unique":false,"attunement":true,"charges":{"max":7,"rest":"long"}}']), nestedRef: { kind: "spells", key: "spellId" } },
    abilitiesField(),
  ],
};
