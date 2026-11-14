import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { CORE_CONTENT_KINDS } from '@/lib/constants/content-kinds';
import { loadRules } from '@/lib/server/campaigns/rules';
import { ContentError } from '@/lib/server/content/errors';
import type { Actor } from '@/lib/utils/api/actor';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { contentKindsOf } from '@/lib/utils/rules/systems/catalog';

const isCore = (kind: string) =>
    (CORE_CONTENT_KINDS as readonly string[]).includes(kind);

const systemByActor = new WeakMap<Actor, Promise<Ruleset['system']>>();

export function actorSystem(actor: Actor): Promise<Ruleset['system']> {
    let system = systemByActor.get(actor);

    if (!system) {
        system = loadRules(actor.campaignId).then((rules) => rules.system);
        systemByActor.set(actor, system);
        system.catch(() => systemByActor.delete(actor));
    }

    return system;
}

/** D15: a kind owned by a module that is not in the campaign composition is hidden, its rows stay */
export async function isKindActive(kind: string, actor: Actor) {
    if (isCore(kind)) return true;

    return contentKindsOf(await actorSystem(actor)).has(kind);
}

export async function assertKindActive(kind: string, actor: Actor) {
    if (!(await isKindActive(kind, actor)))
        throw new ContentError(API_ERRORS.NOT_FOUND, 404);
}
