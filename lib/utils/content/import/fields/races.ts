import { abilitiesField, defineSpec, jsonField, nameField, textField } from "./common";

export const RACES_IMPORT = defineSpec({
  kind: "races",
  fields: [
    nameField(),
    textField("icon"),
    textField("color"),
    { key: "availableSkills", type: "refList", ref: "main-skills" },
    { key: "disabledSkills", type: "refList", ref: "skills" },
    jsonField("passiveAbility"),
    jsonField("spellSlotProgression"),
    { ...jsonField("choices"), nestedRef: { kind: "spells", key: "spellId" } },
    abilitiesField(),
  ],
});
