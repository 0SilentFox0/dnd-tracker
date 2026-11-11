import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const WFRP_META = {
  module: "wfrp",
  keys: ["wfrp"],
  i18n: {
    battle: ["battleWfrp"],
    campaign: ["wfrpMagic", "wfrpAdvancement"],
    member: ["wfrpEquipment"],
    dm: ["wfrpCareers", "wfrpCreation", "wfrpEquipmentEditor", "wfrpTraits", "wfrpTables"],
    pages: {
      character: ["wfrpDowntime", "wfrpCorruption"],
      draft: ["wfrpCreation"],
      dmCharacter: ["wfrpDowntime", "wfrpCorruption"],
      dmCharacters: ["wfrpDowntime"],
      dmRules: ["battleWfrp", "wfrpDowntime", "wfrpCorruption"],
    },
    budgetKb: { member: 107, dm: 111, pages: { character: 4, dmCharacter: 4, dmCharacters: 2 } },
  },
  unusedMechanics: ["morale", "criticals", "formulas", "heroScaling", "initiative", "saves", "deathSaves", "concentration", "conditions", "actions", "classes", "encounters"],
  dmSections: ["careers"],
} as const satisfies SystemMeta;
