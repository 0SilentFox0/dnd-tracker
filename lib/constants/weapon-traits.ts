export const WEAPON_TRAITS = ["light", "finesse", "twoHanded", "versatile", "reach", "thrown", "ammunition"] as const;

export type WeaponTrait = (typeof WEAPON_TRAITS)[number];

export function parseWeaponTraits(raw: unknown): WeaponTrait[] {
  return String(raw ?? "").split(",").map((t) => t.trim()).filter((t): t is WeaponTrait => (WEAPON_TRAITS as readonly string[]).includes(t));
}
