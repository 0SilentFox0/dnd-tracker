import type { SpeciesProfile } from '@/systems/wfrp/rules/creation';
import { SpeciesProfileSchema } from '@/systems/wfrp/server/schemas';

export type ProfileRefIds = { careers: string[]; feats: string[] };

export const profileRefIds = (
    p: Pick<SpeciesProfile, 'careerTable' | 'talents' | 'randomTalents'>
): ProfileRefIds => ({
    careers: p.careerTable.map((r) => r.careerId),
    feats: [...p.talents, ...p.randomTalents.map((r) => r.featId)],
});

export function parseSpeciesProfile(raw: unknown): SpeciesProfile | null {
    const parsed = SpeciesProfileSchema.safeParse(raw);

    return parsed.success ? (parsed.data as SpeciesProfile) : null;
}
