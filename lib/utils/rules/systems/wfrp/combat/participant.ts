import { bonus, value, walkYards } from "../characteristics/derive";
import { type Characteristics, readCharacteristics } from "../characteristics/keys";
import type { HitLocation } from "./constants";
import { LOCATIONS } from "./constants";

export interface WfrpParticipantStats {
  sb: number;
  tb: number;
  ag: number;
  ap: Record<HitLocation, number>;
  flexible?: true;
}

export interface WfrpParticipantFields {
  characteristics: Characteristics;
  wfrp: WfrpParticipantStats;
}

const NO_ARMOR = Object.fromEntries(LOCATIONS.map((l) => [l, 0])) as Record<HitLocation, number>;

export interface WfrpGear {
  ap: Record<HitLocation, number>;
  flexible?: boolean;
}

// The XP ledger is private and unused in battle, so it never enters participant data.
export function wfrpAbilitiesOf(characteristics: Characteristics, gear?: WfrpGear): WfrpParticipantFields {
  return {
    characteristics: { ...characteristics, ledger: [] },
    wfrp: { sb: bonus(characteristics, "s"), ag: value(characteristics, "ag"), tb: bonus(characteristics, "t"), ap: { ...(gear?.ap ?? NO_ARMOR) }, ...(gear?.flexible && { flexible: true as const }) },
  };
}

export const wfrpParticipantFields = (row: { characteristics?: unknown }, gear?: WfrpGear): WfrpParticipantFields => wfrpAbilitiesOf(readCharacteristics(row), gear);

export function wfrpBaseStats(row: { characteristics?: unknown }): { initiative: number; speed: number } {
  const c = readCharacteristics(row);

  return { initiative: value(c, "i"), speed: walkYards(c) * 3 };
}
