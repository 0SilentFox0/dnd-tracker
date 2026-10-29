import { abilitiesField, defineSpec, jsonField, nameField, optionLabels, textField } from "./common";

import { ARTIFACT_RARITY_OPTIONS, ARTIFACT_RARITY_VALUES, ARTIFACT_SLOT_OPTIONS, ARTIFACT_SLOT_VALUES } from "@/lib/constants/artifacts";
export const ARTIFACTS_IMPORT = defineSpec({
  kind: "artifacts",
  fields: [
    nameField(),
    textField("description"),
    { key: "rarity", type: "enum", enumValues: ARTIFACT_RARITY_VALUES, enumLabels: optionLabels(ARTIFACT_RARITY_OPTIONS) },
    { key: "slot", type: "enum", required: true, enumValues: ARTIFACT_SLOT_VALUES, enumLabels: optionLabels(ARTIFACT_SLOT_OPTIONS) },
    { key: "setId", type: "ref", ref: "artifact-sets" },
    textField("icon"),
    jsonField("weapon"),
    jsonField("armor"),
    { ...jsonField("item"), nestedRef: { kind: "spells", key: "spellId" } },
    abilitiesField(),
  ],
});
