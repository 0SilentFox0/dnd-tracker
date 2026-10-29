import { abilitiesField, defineSpec, jsonField, nameField, textField } from "./common";

export const ARTIFACT_SETS_IMPORT = defineSpec({
  kind: "artifact-sets",
  fields: [
    nameField(),
    textField("description"),
    jsonField("setBonus"),
    abilitiesField(),
    { key: "artifactIds", type: "refList", ref: "artifacts" },
    textField("icon"),
  ],
});
