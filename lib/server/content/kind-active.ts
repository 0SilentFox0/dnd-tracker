import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { CORE_CONTENT_KINDS } from '@/lib/constants/content-kinds';
import { loadRules } from '@/lib/server/campaigns/rules';
import { ContentError } from '@/lib/server/content/errors';
import type { Actor } from '@/lib/utils/api/actor';
import { contentKindsOf } from '@/lib/utils/rules/systems/catalog';

const isCore = (kind: string) =>
    (CORE_CONTENT_KINDS as readonly string[]).includes(kind);

/** D15: a kind owned by a module that is not in the campaign composition is hidden, its rows stay */
export async function isKindActive(kind: string, actor: Actor) {
    if (isCore(kind)) return true;

    const { system } = await loadRules(actor.campaignId);

    return contentKindsOf(system).has(kind);
}

export async function assertKindActive(kind: string, actor: Actor) {
    if (!(await isKindActive(kind, actor)))
        throw new ContentError(API_ERRORS.NOT_FOUND, 404);
}
