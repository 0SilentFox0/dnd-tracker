export const CORE_ACTION_KEYS = ["dash", "disengage", "dodge", "help", "hide", "ready", "standUp", "grapple", "shove", "escape"] as const;

export type CoreActionKey = (typeof CORE_ACTION_KEYS)[number];

export type CoreActionDef = {
  cost: "action" | "bonusAction" | "movement";
  target: "none" | "allyAdjacent" | "enemyAdjacent";
};

export const CORE_ACTION_REGISTRY: Record<CoreActionKey, CoreActionDef> = {
  dash: { cost: "action", target: "none" },
  disengage: { cost: "action", target: "none" },
  dodge: { cost: "action", target: "none" },
  help: { cost: "action", target: "allyAdjacent" },
  hide: { cost: "action", target: "none" },
  ready: { cost: "action", target: "none" },
  standUp: { cost: "movement", target: "none" },
  grapple: { cost: "action", target: "enemyAdjacent" },
  shove: { cost: "action", target: "enemyAdjacent" },
  escape: { cost: "action", target: "none" },
};
