/**
 * Утиліти для роботи з модифікаторами артефактів
 */

import type { ArtifactModifier } from "../types/participant";

import {
  ArtifactModifierType,
  DEFAULT_ARTIFACT_MODIFIERS,
} from "@/lib/constants/artifacts";

export type { ArtifactModifier };

/** Отримує значення модифікатора артефакта як рядок */
export function getModifierValue(
  modifiers: ArtifactModifier[],
  modifierType: ArtifactModifierType,
  defaultValue: string,
): string {
  return (
    modifiers.find((m) => m.type === modifierType)?.value?.toString() ||
    defaultValue
  );
}

/** Отримує опціональне значення модифікатора артефакта */
export function getOptionalModifierValue(
  modifiers: ArtifactModifier[],
  modifierType: ArtifactModifierType,
): string | undefined {
  return modifiers.find((m) => m.type === modifierType)?.value?.toString();
}

export { ArtifactModifierType, DEFAULT_ARTIFACT_MODIFIERS };
