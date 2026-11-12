import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import { sectionSchemas } from "@/lib/utils/rules/section-shapes";
import { itemsFromShape, type SectionsContribution } from "@/lib/utils/rules/sections";

export const RETALIATION_SECTIONS: SectionsContribution = {
  extend: { actions: itemsFromShape(sectionSchemas.actions.shape, DEFAULT_RULES.actions, ["retaliation"]) },
};
