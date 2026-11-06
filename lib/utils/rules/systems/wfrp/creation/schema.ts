import { z } from "zod";

import { CHARACTERISTIC_KEYS, type CharacteristicKey } from "../characteristics/keys";
import type { SpeciesProfile } from "./profile";

const max = z.number().int().min(1).max(100);

const id = z.string().min(1).max(100);

const tableOk = <R extends { max: number }>(rows: R[]) => rows.every((r, i) => i === 0 || r.max > rows[i - 1].max);

const endsAt100 = <R extends { max: number }>(rows: R[]) => rows.length === 0 || rows[rows.length - 1].max === 100;

const featTable = z.array(z.strictObject({ max, featId: id })).max(100).refine(tableOk, { message: "creation.tableAscending" }).refine(endsAt100, { message: "creation.tableEnd" }).default([]);

const careerTable = z.array(z.strictObject({ max, careerId: id })).max(100).refine(tableOk, { message: "creation.tableAscending" }).refine(endsAt100, { message: "creation.tableEnd" }).default([]);

const mod = z.number().int().min(-20).max(20).optional();

export const SpeciesProfileSchema = z.strictObject({
  mods: z.strictObject(Object.fromEntries(CHARACTERISTIC_KEYS.map((k) => [k, mod])) as Record<CharacteristicKey, typeof mod>).default({}),
  move: z.number().int().min(1).max(12).default(4),
  fate: z.number().int().min(0).max(9).default(0),
  extraWounds: z.number().int().min(0).max(3).default(0),
  talents: z.array(z.string().min(1).max(100)).max(20).default([]),
  randomTalentCount: z.number().int().min(0).max(5).default(0),
  randomTalents: featTable,
  careerTable: careerTable,
});

export function parseProfile(raw: unknown): SpeciesProfile {
  const parsed = SpeciesProfileSchema.safeParse(raw ?? {});

  return (parsed.success ? parsed.data : SpeciesProfileSchema.parse({})) as SpeciesProfile;
}
