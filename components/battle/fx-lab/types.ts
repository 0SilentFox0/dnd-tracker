import type { FxPoint } from "@/components/battle/fx/runtime/geometry";

export type FxScenarioId = "fireball" | "slash" | "heal" | "curse";

export type FxReaction = "damage" | "heal" | "debuff";

export type { FxPoint };

export interface FxContext {
  layer: HTMLDivElement;
  from: FxPoint;
  to: FxPoint;
  fromEl: HTMLElement;
  toEl: HTMLElement;
  impact: () => void;
}

export interface FxEngine {
  play: (scenario: FxScenarioId, ctx: FxContext) => Promise<void>;
}

export type FxEngineId = "canvas" | "sprites";
