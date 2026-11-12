import { sectionItems } from "@/lib/utils/rules/section-items";
import type { SectionsContribution } from "@/lib/utils/rules/sections";

export const WFRP_SECTIONS: SectionsContribution = {
  sections: {
    advancement: { owner: "wfrp", mechanic: true, items: sectionItems("advancement") },
    tables: { owner: "wfrp", mechanic: true, playerHidden: true, items: sectionItems("tables") },
  },
};
