import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import { sectionSchemas } from "@/lib/utils/rules/section-shapes";
import { itemsFromShape, type SectionsContribution } from "@/lib/utils/rules/sections";

export const MORALE_SECTIONS: SectionsContribution = {
  sections: { morale: { owner: "morale", mechanic: true, items: itemsFromShape(sectionSchemas.morale.shape, DEFAULT_RULES.morale) } },
};
