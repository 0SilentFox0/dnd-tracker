import { abilitiesField, defineSpec, jsonField, nameField, recordLabels, textField } from "./common";

import { FEAT_TYPE_LABELS, FEAT_TYPES } from "@/lib/constants/choices";
export const FEATS_IMPORT = defineSpec({
  kind: "feats",
  fields: [
    nameField(),
    textField("icon"),
    { key: "type", type: "enum", enumValues: FEAT_TYPES, enumLabels: recordLabels(FEAT_TYPE_LABELS) },
    jsonField("prerequisite"),
    { key: "repeatable", type: "bool" },
    textField("description"),
    abilitiesField(),
    jsonField("choices"),
  ],
});
