import type { AbilityKey } from "@/lib/constants/abilities";
import { dynamicTextRef } from "@/lib/i18n/text-ref";
import type { ActiveEffect } from "@/types/battle";
import type { LogLine, TextRef } from "@/types/text";

export const abilityRef = (key: AbilityKey): TextRef => dynamicTextRef(`gameTerms.abilities.${key}.label`);

export const abilityShortRef = (key: AbilityKey): TextRef => dynamicTextRef(`gameTerms.abilities.${key}.short`);

export const effectName = (effect: Pick<ActiveEffect, "name" | "label">): LogLine => effect.label ?? effect.name;
