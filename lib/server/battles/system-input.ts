import { API_ERRORS } from '@/lib/constants/api-errors';
import { ruleErrorOf } from '@/lib/utils/battle/store/errors';
import type { Ruleset } from '@/lib/utils/rules';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';

/** Lazy: the registry reaches the mutations through the d20 crit-choice operation. */
export async function parseSystemInput(
    rules: Ruleset,
    kind: 'attackInput' | 'castInput',
    body: object,
    serverRolled: boolean
): Promise<SystemSlot | undefined> {
    const { systemServerOf } = await import('@/lib/server/systems/registry');

    const schema = systemServerOf(rules).schemas[kind];

    if (!schema) return undefined;

    const parsed = schema.safeParse(
        serverRolled ? { ...body, secondRoll: undefined } : body
    );

    if (!parsed.success)
        throw ruleErrorOf('action_rejected', API_ERRORS.INVALID_BODY);

    return parsed.data;
}
