import { sectionItems } from "@/lib/utils/rules/section-items";
import type { SectionsContribution } from "@/lib/utils/rules/sections";

export const HEROSCALING_SECTIONS: SectionsContribution = {
  sections: { heroScaling: { owner: "heroscaling", mechanic: true, items: sectionItems("heroScaling") } },
};
