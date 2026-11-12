import type { RuleSystemMagic } from "@/lib/utils/rules/systems/types";

/** A system with no spell slots, save DCs or upcasting; a casting test is added on top */
export const noMagic: RuleSystemMagic = {
  saveDc: () => 10,
  upcast: { steps: () => 0 },
};
