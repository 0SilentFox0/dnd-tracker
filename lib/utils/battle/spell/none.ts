import type { RuleSystemMagic, RuleSystemSustain } from "@/lib/utils/rules/systems/types";

/** Nothing is held: casts bind no duration to the caster */
export const noSustain: RuleSystemSustain = {
  holds: () => false,
  holding: () => false,
  begin: (ps) => ({ participants: ps, messages: [] }),
  drop: (ps) => ({ participants: ps, messages: [] }),
  tag: (_before, after) => after,
  anchorLive: () => true,
  dropOrphaned: (ps) => ({ participants: ps, messages: [] }),
};

/** A system with no spell slots, save DCs or upcasting; a casting test is added on top */
export const noMagic: RuleSystemMagic = {
  saveDc: () => 10,
  upcast: { steps: () => 0 },
  sustain: noSustain,
};
