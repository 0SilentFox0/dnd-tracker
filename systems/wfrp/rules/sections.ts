import { sectionItems } from "@/lib/utils/rules/section-items";
import { sectionSchemas } from "@/lib/utils/rules/section-shapes";
import { itemsFromShape, type SectionsContribution } from "@/lib/utils/rules/sections";
import { DEFAULT_ADVANCEMENT_RULES } from "@/systems/wfrp/rules/advancement/rules";

export const WFRP_SECTIONS: SectionsContribution = {
  sections: {
    advancement: { owner: "wfrp", mechanic: true, items: itemsFromShape(sectionSchemas.advancement.shape as never, DEFAULT_ADVANCEMENT_RULES) },
    tables: { owner: "wfrp", mechanic: true, playerHidden: true, items: sectionItems("tables") },
  },
};
