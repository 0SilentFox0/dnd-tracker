import type { FxElement } from "./types";

const ELEMENTS: Record<string, FxElement> = {
  fire: "fire",
  cold: "cold",
  lightning: "lightning",
  thunder: "lightning",
  acid: "poison",
  poison: "poison",
  necrotic: "necrotic",
  radiant: "radiant",
  psychic: "arcane",
  force: "arcane",
  magic: "arcane",
  slashing: "physical",
  piercing: "physical",
  bludgeoning: "physical",
  physical: "physical",
  bleed: "physical",
};

export function elementOf(damageType: string | undefined, fallback: FxElement): FxElement {
  return (damageType && ELEMENTS[damageType]) || fallback;
}
