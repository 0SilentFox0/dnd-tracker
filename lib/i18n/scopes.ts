import type { Namespace } from "./config";

export const ROOT_NAMESPACES = ["common", "validation", "whatsNew", "gameTerms"] as const satisfies readonly Namespace[];

export const CAMPAIGN_NAMESPACES = [
  "common",
  "validation",
  "onboarding",
  "races",
  "skills",
  "classes",
  "feats",
  "backgrounds",
  "artifacts",
  "music",
  "choices",
  "campaigns",
  "dashboard",
  "characters",
  "characterProfile",
  "inventory",
  "rest",
  "spells",
  "spellEditor",
  "editors",
  "units",
  "abilities",
  "abilityRegistry",
  "rules",
  "skillTree",
  "scenario",
  "scenarioGraph",
  "show",
  "acquaintances",
  "world",
  "ai",
  "compendium",
  "contentImport",
  "gameTerms",
  "abilityText",
  "battleTerms",
] as const satisfies readonly Namespace[];

export const BATTLE_NAMESPACES = ["battleCommon", "battle", "battleWizards", "battleDm", "battleSetup", "battleLog", "battleActions"] as const satisfies readonly Namespace[];

export const WFRP_BATTLE_NAMESPACES = [...BATTLE_NAMESPACES, "battleWfrp"] as const satisfies readonly Namespace[];

export const WFRP_CAMPAIGN_EXTRA = ["wfrpMagic", "wfrpAdvancement"] as const satisfies readonly Namespace[];

// Summary, encumbrance and money texts every member sees; kept out of WFRP_CAMPAIGN_EXTRA so the base scope stays measurable
export const WFRP_MEMBER_EXTRA = ["wfrpEquipment"] as const satisfies readonly Namespace[];

export const WFRP_DM_EXTRA = ["wfrpCareers", "wfrpCreation", "wfrpEquipmentEditor", "wfrpTraits"] as const satisfies readonly Namespace[];
