import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const WFRP_META = {
  module: "wfrp",
  kind: "base",
  keys: ["wfrp"],
  tokens: ["wfrp"],
  distance: { unit: "yd", perCell: 2 },
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
    budgetKb: { battle: 106, member: 108, dm: 112, pages: { character: 4, dmCharacter: 4, dmCharacters: 2 } },
  },
  dmSections: ["careers"],
} as const satisfies SystemMeta;
