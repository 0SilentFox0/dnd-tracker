import { ApiError } from '@/lib/api/client';
import { RULE_SYSTEM_REGISTRY } from '@/lib/utils/rules/systems';
import type { WfrpDraftIdentityInput } from '@/systems/wfrp/api/types';
import { CHARACTERISTIC_KEYS } from '@/systems/wfrp/rules/characteristics/keys';
import {
    type CreationPicks,
    type CreationRolls,
} from '@/systems/wfrp/rules/creation';

export type WfrpDraftStepId =
    | 'species'
    | 'career'
    | 'stats'
    | 'talents'
    | 'identity';

export type StatsMode = CreationPicks['stats']['mode'];

export type CareerMode = CreationPicks['career']['mode'];

export const FULL_STEPS: WfrpDraftStepId[] = [
    'species',
    'career',
    'stats',
    'talents',
    'identity',
];

export const STAT_COUNT = CHARACTERISTIC_KEYS.length;

export const VISIBLE_STEP_ERRORS = new Set([
    'CAREER_UNKNOWN',
    'FEAT_UNKNOWN',
    'PROFILE_NOT_READY',
]);

export const STEP_ERRORS: Record<WfrpDraftStepId, (code: string) => boolean> = {
    species: (c) => c === 'PROFILE_NOT_READY',
    career: (c) => c.startsWith('CAREER_'),
    stats: (c) => c.startsWith('STATS_') || c.startsWith('POINTS_'),
    talents: (c) => c.startsWith('TALENT_') || c === 'FEAT_UNKNOWN',
    identity: () => false,
};

export const careerPickValid = (
    mode: CareerMode,
    careerId: string,
    rolls: CreationRolls['careerRolls']
) =>
    mode === 'rolled'
        ? careerId === rolls[0]?.careerId
        : mode === 'choice'
          ? rolls.some((r) => r.careerId === careerId)
          : true;

export const cleanIdentity = ({
    name,
    alignment,
    background,
    avatar,
    goals,
}: WfrpDraftIdentityInput): WfrpDraftIdentityInput => ({
    name: name.trim(),
    ...(alignment &&
        RULE_SYSTEM_REGISTRY.wfrp.identity.alignments && { alignment }),
    ...(background && { background }),
    ...(avatar && { avatar }),
    ...(goals?.length && { goals }),
});

export const serverIssueCodes = (error: unknown): string[] => {
    const issues =
        error instanceof ApiError
            ? (error.body as { issues?: unknown } | undefined)?.issues
            : undefined;

    return Array.isArray(issues)
        ? [...new Set(issues.filter((i): i is string => typeof i === 'string'))]
        : [];
};
