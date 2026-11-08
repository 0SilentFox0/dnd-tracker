import { bonus, value, walkYards } from "../characteristics/derive";
import { type Characteristics, readCharacteristics } from "../characteristics/keys";
import type { HitLocation } from "./constants";
import { LOCATIONS } from "./constants";

import type { TraitSize } from "@/lib/utils/abilities/schema/kinds";

export interface WfrpParticipantStats {
  sb: number;
  tb: number;
  ag: number;
  ap: Record<HitLocation, number>;
  flexible?: true;
  castAp?: number;
  size?: TraitSize;
  ward?: number;
}

export interface WfrpParticipantFields {
  characteristics: Characteristics;
  wfrp: WfrpParticipantStats;
}

const NO_ARMOR = Object.fromEntries(LOCATIONS.map((l) => [l, 0])) as Record<HitLocation, number>;

export interface WfrpGear {
  ap: Record<HitLocation, number>;
  flexible?: boolean;
  armourOnly?: Record<HitLocation, number>;
}

function castApOf(gear?: WfrpGear): { castAp?: number } {
  if (!gear?.armourOnly) return {};

  const armour = Math.max(gear.armourOnly.head, gear.armourOnly.body);

  return armour === Math.max(gear.ap.head, gear.ap.body) ? {} : { castAp: armour };
}

// The XP ledger and downtime are private and unused in battle, so they never enter participant data.
export function wfrpAbilitiesOf(characteristics: Characteristics, gear?: WfrpGear): WfrpParticipantFields {
  const { downtime: _downtime, ...rest } = characteristics;

  return {
    characteristics: { ...rest, ledger: [] },
    wfrp: { sb: bonus(characteristics, "s"), ag: value(characteristics, "ag"), tb: bonus(characteristics, "t"), ap: { ...(gear?.ap ?? NO_ARMOR) }, ...(gear?.flexible && { flexible: true as const }), ...castApOf(gear) },
  };
}

export const wfrpParticipantFields = (row: { characteristics?: unknown }, gear?: WfrpGear): WfrpParticipantFields => wfrpAbilitiesOf(readCharacteristics(row), gear);

export function wfrpBaseStats(row: { characteristics?: unknown }): { initiative: number; speed: number } {
  const c = readCharacteristics(row);

  return { initiative: value(c, "i"), speed: walkYards(c) * 3 };
}
