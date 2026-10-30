import { ARCHETYPE_CLASS_UK } from "./archetype-class.uk";

import type { HeroArchetypeKey } from "@/lib/constants/hero-archetypes";
import type { Locale } from "@/lib/i18n/config";

const ARCHETYPE_CLASS_EN: Record<HeroArchetypeKey, string> = { warrior: "Warrior", paladin: "Paladin", ranger: "Ranger", rogue: "Rogue", mage: "Mage" };

export const archetypeClasses = (locale: Locale): Record<HeroArchetypeKey, string> => (locale === "en" ? ARCHETYPE_CLASS_EN : ARCHETYPE_CLASS_UK);
