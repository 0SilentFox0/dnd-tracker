import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import { CRITICALS_ORDER_MESSAGE, INITIATIVE_ORDER_MESSAGE, sectionSchemas } from "@/lib/utils/rules/section-shapes";
import { itemsFromShape, type SectionsContribution } from "@/lib/utils/rules/sections";

const part = <K extends keyof typeof sectionSchemas>(name: K, keys?: readonly string[]) => itemsFromShape(sectionSchemas[name].shape as never, DEFAULT_RULES[name] as never, keys);

export const D20_SECTIONS: SectionsContribution = {
  sections: {
    criticals: {
      owner: "d20",
      mechanic: true,
      items: part("criticals"),
      refine: (v) => typeof v.critOn !== "number" || typeof v.fumbleOn !== "number" || v.fumbleOn < v.critOn,
      refineMessage: CRITICALS_ORDER_MESSAGE,
    },
    formulas: { owner: "d20", mechanic: true, items: part("formulas") },
    initiative: {
      owner: "d20",
      mechanic: true,
      items: part("initiative"),
      refine: (v) => typeof v.heroMin !== "number" || typeof v.heroMax !== "number" || v.heroMin <= v.heroMax,
      refineMessage: INITIATIVE_ORDER_MESSAGE,
    },
    saves: { owner: "d20", mechanic: true, items: part("saves") },
    deathSaves: { owner: "d20", mechanic: true, items: part("deathSaves") },
    concentration: { owner: "d20", mechanic: true, items: part("concentration") },
    conditions: { owner: "d20", mechanic: true, items: part("conditions") },
    actions: { owner: "d20", mechanic: true, items: part("actions", ["enabled", "opportunityAttacks", "variant"]) },
    classes: { owner: "d20", mechanic: true, items: part("classes") },
  },
  extend: {
    outOfCombat: part("outOfCombat", ["longRestHitDice", "inspiration"]),
    encounters: part("encounters", ["edition", "autoXp"]),
    items: part("items", ["attunementLimit"]),
  },
};
