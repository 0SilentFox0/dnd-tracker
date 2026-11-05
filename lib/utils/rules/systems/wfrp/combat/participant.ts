import { bonus, value, walkYards } from "../characteristics/derive";
import { type Characteristics, readCharacteristics } from "../characteristics/keys";
import type { HitLocation } from "./constants";
import { LOCATIONS } from "./constants";

export interface WfrpParticipantStats {
  sb: number;
  tb: number;
  ag: number;
  ap: Record<HitLocation, number>;
}

export interface WfrpParticipantFields {
  characteristics: Characteristics;
  wfrp: WfrpParticipantStats;
}

const NO_ARMOR = Object.fromEntries(LOCATIONS.map((l) => [l, 0])) as Record<HitLocation, number>;

// AP stays 0 until armor lands (5f). The XP ledger is private and unused in battle, so it never enters participant data.
export function wfrpAbilitiesOf(characteristics: Characteristics, armorAp: Record<HitLocation, number> = NO_ARMOR): WfrpParticipantFields {
  return { characteristics: { ...characteristics, ledger: [] }, wfrp: { sb: bonus(characteristics, "s"), ag: value(characteristics, "ag"), tb: bonus(characteristics, "t"), ap: { ...armorAp } } };
}

export const wfrpParticipantFields = (row: { characteristics?: unknown }): WfrpParticipantFields => wfrpAbilitiesOf(readCharacteristics(row));

export function wfrpBaseStats(row: { characteristics?: unknown }): { initiative: number; speed: number } {
  const c = readCharacteristics(row);

  return { initiative: value(c, "i"), speed: walkYards(c) * 3 };
}
