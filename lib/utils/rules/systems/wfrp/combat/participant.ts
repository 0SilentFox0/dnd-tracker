import { bonus, runYards } from "../characteristics/derive";
import { type Characteristics, readCharacteristics } from "../characteristics/keys";
import type { HitLocation } from "./constants";
import { LOCATIONS } from "./constants";

export interface WfrpParticipantStats {
  sb: number;
  tb: number;
  ap: Record<HitLocation, number>;
  moveYd: number;
}

export interface WfrpParticipantFields {
  characteristics: Characteristics;
  wfrp: WfrpParticipantStats;
}

const NO_ARMOR = Object.fromEntries(LOCATIONS.map((l) => [l, 0])) as Record<HitLocation, number>;

// AP stays 0 until armor lands (5f).
export function wfrpAbilitiesOf(characteristics: Characteristics, armorAp: Record<HitLocation, number> = NO_ARMOR): WfrpParticipantFields {
  return { characteristics, wfrp: { sb: bonus(characteristics, "s"), tb: bonus(characteristics, "t"), ap: { ...armorAp }, moveYd: runYards(characteristics) } };
}

export const wfrpParticipantFields = (row: { characteristics?: unknown }): WfrpParticipantFields => wfrpAbilitiesOf(readCharacteristics(row));
