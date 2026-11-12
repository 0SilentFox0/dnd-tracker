import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import { sectionSchemas } from "@/lib/utils/rules/section-shapes";
import { itemsFromShape, type SectionsContribution } from "@/lib/utils/rules/sections";

export const WFRP_SECTIONS: SectionsContribution = {
  sections: {
    advancement: { owner: "wfrp", mechanic: true, items: itemsFromShape(sectionSchemas.advancement.shape, DEFAULT_RULES.advancement) },
    tables: { owner: "wfrp", mechanic: true, playerHidden: true, items: itemsFromShape(sectionSchemas.tables.shape, DEFAULT_RULES.tables) },
  },
};
