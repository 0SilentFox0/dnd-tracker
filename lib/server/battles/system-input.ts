import { API_ERRORS } from '@/lib/constants/api-errors';
import { systemServerOf } from '@/lib/server/systems/lookup';
import { ruleErrorOf } from '@/lib/utils/battle/store/errors';
import type { Ruleset } from '@/lib/utils/rules';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';

export async function parseSystemInput(
    rules: Ruleset,
    kind: 'attackInput' | 'castInput',
    body: object,
    serverRolled: boolean
): Promise<SystemSlot | undefined> {
    const schema = systemServerOf(rules).schemas[kind];

    if (!schema) return undefined;

    const parsed = schema.safeParse(
        serverRolled ? { ...body, secondRoll: undefined } : body
    );

    if (!parsed.success)
        throw ruleErrorOf('action_rejected', API_ERRORS.INVALID_BODY);

    return parsed.data;
}
