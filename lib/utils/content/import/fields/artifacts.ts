import { abilitiesField, defineSpec, jsonField, nameField, textField } from "./common";

import { ARTIFACT_RARITY_VALUES, ARTIFACT_SLOT_VALUES } from "@/lib/constants/artifacts";
export const ARTIFACTS_IMPORT = defineSpec({
  kind: "artifacts",
  fields: [
    nameField(),
    textField("description"),
    { key: "rarity", type: "enum", enumValues: ARTIFACT_RARITY_VALUES },
    { key: "slot", type: "enum", required: true, enumValues: ARTIFACT_SLOT_VALUES },
    { key: "setId", type: "ref", ref: "artifact-sets" },
    textField("icon"),
    jsonField("weapon"),
    jsonField("armor"),
    { ...jsonField("item"), nestedRef: { kind: "spells", key: "spellId" } },
    abilitiesField(),
  ],
});
