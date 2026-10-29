import type { HeroArchetypeKey } from "@/lib/constants/hero-archetypes";

export interface BackstoryTable {
  origin: Array<(c: { name: string; place: string }) => string>;
  turn: Record<HeroArchetypeKey, string[]>;
  drive: string[];
  mainGoals: string[];
  personalGoals: string[];
  place: (raceName: string) => string;
}
