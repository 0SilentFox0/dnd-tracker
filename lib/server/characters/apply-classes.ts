import 'server-only';
import { getCachedClasses } from '@/lib/cache/reference-data';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { classesById } from '@/lib/utils/characters/classes';
import {
    type ClassApplicationInput,
    type ClassesApplyResult,
    deriveClassApplication,
} from '@/lib/utils/characters/classes/application';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';
import { toGameClassData } from '@/lib/utils/characters/classes/row';
import type { GameClassData } from '@/types/classes';

export {
    type ClassesApplied,
    type ClassesApplyResult,
    validateClassEntries,
} from '@/lib/utils/characters/classes/application';

interface ApplyClassesInput extends ClassApplicationInput {
    campaignId: string;
    preloaded?: Record<string, GameClassData>;
}

export async function applyClasses({
    campaignId,
    preloaded,
    ...input
}: ApplyClassesInput): Promise<ClassesApplyResult> {
    if (input.entries.length === 0) return { ok: true, data: null };

    if (!classesEnabled(input.rules))
        return { ok: false, status: 422, error: API_ERRORS.CLASSES_DISABLED };

    const byId =
        preloaded ??
        classesById((await getCachedClasses(campaignId)).map(toGameClassData));

    return deriveClassApplication(input, byId);
}
