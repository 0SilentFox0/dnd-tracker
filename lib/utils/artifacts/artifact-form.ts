import { ArtifactSlot } from "@/lib/constants/artifacts";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { ArmorStats } from "@/lib/utils/artifacts/armor-stats";
import { isWeaponSlot } from "@/lib/utils/artifacts/weapon-slot";
import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats";
import type { ItemStats } from "@/lib/utils/items/item-stats";

export interface ArtifactFormState {
  name: string;
  description: string;
  rarity: string;
  slot: string;
  icon: string;
  setId: string | null;
  abilities: Ability[];
  weapon: WeaponStats;
  armor?: ArmorStats | null;
  item?: ItemStats | null;
}

export interface ArtifactFormSubmitPayload {
  name: string;
  description: string | null | undefined;
  rarity: string;
  slot: string;
  icon: string | null;
  setId: string | null | undefined;
  abilities: Ability[];
  weapon?: WeaponStats;
  armor?: ArmorStats | null;
  item?: ItemStats | null;
}

const bonusOnly = (w: WeaponStats): WeaponStats => ({
  ...(w.attackBonus !== undefined && { attackBonus: w.attackBonus }),
  ...(w.damageBonus !== undefined && { damageBonus: w.damageBonus }),
});

export function buildArtifactPayload(s: ArtifactFormState, mode: "create" | "edit"): ArtifactFormSubmitPayload {
  const property = !!s.item?.property;

  const cleared = mode === "edit" ? null : undefined;

  return {
    name: s.name.trim(),
    description: s.description.trim() || cleared,
    rarity: s.rarity,
    slot: s.slot,
    icon: s.icon.trim() || null,
    setId: s.setId || cleared,
    abilities: s.abilities,
    ...(isWeaponSlot(s.slot) && { weapon: property ? bonusOnly(s.weapon) : s.weapon }),
    ...(s.slot === ArtifactSlot.ARMOR && (property ? mode === "edit" && { armor: null } : s.armor ? { armor: s.armor } : mode === "edit" && { armor: null })),
    ...(s.item ? { item: s.item } : s.item === null && mode === "edit" && { item: null }),
  };
}
