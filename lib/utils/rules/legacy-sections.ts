import type { Ruleset } from "@/lib/utils/rules/section-shapes";

export type D20Rules = Pick<Ruleset, "criticals" | "formulas" | "initiative" | "saves" | "deathSaves" | "concentration" | "conditions" | "classes" | "outOfCombat" | "encounters" | "items"> & {
  actions: Omit<Ruleset["actions"], "retaliation">;
};

export type MoraleRules = Pick<Ruleset, "morale">;

export type RetaliationRules = Pick<Ruleset["actions"], "retaliation">;

export type HeroScalingRules = Pick<Ruleset, "heroScaling">;
