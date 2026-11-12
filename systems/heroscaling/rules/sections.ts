import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import { sectionSchemas } from "@/lib/utils/rules/section-shapes";
import { itemsFromShape, type SectionsContribution } from "@/lib/utils/rules/sections";

export const HEROSCALING_SECTIONS: SectionsContribution = {
  sections: { heroScaling: { owner: "heroscaling", mechanic: true, items: itemsFromShape(sectionSchemas.heroScaling.shape, DEFAULT_RULES.heroScaling) } },
};
