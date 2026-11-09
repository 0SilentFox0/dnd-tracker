import type { SpeciesProfile } from "@/lib/utils/rules/systems";
import { SpeciesProfileSchema } from "@/lib/utils/rules/systems/schemas";

export type ProfileRefIds = { careers: string[]; feats: string[] };

export const profileRefIds = (p: Pick<SpeciesProfile, "careerTable" | "talents" | "randomTalents">): ProfileRefIds => ({
  careers: p.careerTable.map((r) => r.careerId),
  feats: [...p.talents, ...p.randomTalents.map((r) => r.featId)],
});

export function parseSpeciesProfile(raw: unknown): SpeciesProfile | null {
  const parsed = SpeciesProfileSchema.safeParse(raw);

  return parsed.success ? (parsed.data as SpeciesProfile) : null;
}
