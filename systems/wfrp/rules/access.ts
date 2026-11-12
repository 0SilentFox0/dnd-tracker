import type { Ruleset } from "@/lib/utils/rules/section-shapes";

export type WfrpRules = Pick<Ruleset, "advancement" | "tables">;

export const wfrpRules = ({ advancement, tables }: Ruleset): WfrpRules => ({ advancement, tables });
