import { sectionItems } from "@/lib/utils/rules/section-items";
import type { SectionsContribution } from "@/lib/utils/rules/sections";

export const RETALIATION_SECTIONS: SectionsContribution = {
  extend: { actions: sectionItems("actions", ["retaliation"]) },
};
