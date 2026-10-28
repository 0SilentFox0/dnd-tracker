import { ArtifactModifierType, ArtifactSlot } from "@/lib/constants/artifacts";
import { parseWeaponTraits } from "@/lib/constants/weapon-traits";

type OffHandCandidate = { slot: string; bonuses?: unknown; modifiers?: unknown };

const isLight = (modifiers: unknown) =>
  Array.isArray(modifiers) &&
  modifiers.some((m) => {
    if (!m || typeof m !== "object") return false;

    const { type, value } = m as { type?: unknown; value?: unknown };

    return type === ArtifactModifierType.TRAITS && parseWeaponTraits(value).includes("light");
  });

/** Zod-free on purpose: the profile entry chunk uses it. */
export function canEquipOffHand(artifact: OffHandCandidate, classesEnabled: boolean): boolean {
  return classesEnabled && artifact.slot === ArtifactSlot.WEAPON && isLight(artifact.modifiers);
}
