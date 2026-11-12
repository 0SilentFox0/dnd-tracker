import { DEFAULT_RULES } from "./defaults";
import { sectionSchemas } from "./section-shapes";
import { itemsFromShape, type SectionsContribution } from "./sections";

const part = <K extends keyof typeof sectionSchemas>(name: K, keys: readonly string[]) => itemsFromShape(sectionSchemas[name].shape as never, DEFAULT_RULES[name] as never, keys);

export const CORE_SECTIONS: SectionsContribution = {
  sections: {
    system: { owner: "core", mechanic: false, items: part("system", ["key"]) },
    defaultAttacks: { owner: "core", mechanic: true, items: part("defaultAttacks", ["meleeName", "rangedName", "weaponName"]) },
    spellIngredients: { owner: "core", mechanic: true, items: part("spellIngredients", ["enabled", "autoPay"]) },
    outOfCombat: { owner: "core", mechanic: true, items: part("outOfCombat", ["persistResources", "xp"]) },
    encounters: { owner: "core", mechanic: true, items: part("encounters", ["balance", "unitGroups"]) },
    items: { owner: "core", mechanic: true, items: part("items", ["enabled"]) },
  },
};
