import { API_ERRORS, type ApiErrorKey } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';
import { systemServerOf } from '@/lib/server/systems/registry';
import type { Ruleset } from '@/lib/utils/rules/schema';

type SystemStatsResult =
    | { ok: true; value: unknown | null }
    | { ok: false; key: ApiErrorKey; issues?: unknown };

function validateSystemStats(
    rules: Ruleset,
    stats: unknown
): SystemStatsResult {
    if (stats === null) return { ok: true, value: null };

    const schema = systemServerOf(rules).schemas.systemStats;

    if (!schema) return { ok: false, key: API_ERRORS.SYSTEM_STATS_UNSUPPORTED };

    const parsed = schema.safeParse(stats);

    return parsed.success
        ? { ok: true, value: parsed.data }
        : {
              ok: false,
              key: API_ERRORS.SYSTEM_STATS_INVALID,
              issues: parsed.error.issues,
          };
}

export function systemStatsOrThrow(
    rules: Ruleset,
    stats: unknown
): unknown | null {
    const result = validateSystemStats(rules, stats);

    if (!result.ok) throw new ContentError(result.key, 400, result.issues);

    return result.value;
}
