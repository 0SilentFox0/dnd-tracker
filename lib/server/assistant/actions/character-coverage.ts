import { SYSTEM_SERVER_UNION } from '@/lib/server/systems/registry';

/** Implemented shared character adapters. Activation of model transports remains T14. */
const base = 'campaigns/[id]/characters';

const hero = `${base}/[characterId]`;

/** One row per method and operation of the composed system routes; bare handlers have no assistant action */
const systemRows = (scope: 'character' | 'campaign', route: string) =>
    Object.values(SYSTEM_SERVER_UNION).flatMap((server) =>
        Object.values(server.routes?.[scope] ?? {}).flatMap((systemRoute) =>
            Object.entries(systemRoute).flatMap(([method, target]) =>
                target && 'operation' in target
                    ? [[method, route, target.operation, 'system-route']]
                    : []
            )
        )
    );

export const CHARACTER_ACTION_COVERAGE = [
    ['GET', base, 'list', 'character-actions'],
    ['POST', base, 'create', 'character-actions'],
    ['DELETE', base, 'delete-all', 'character-actions'],
    ['GET', `${base}/roster`, 'roster', 'character-roster-api'],
    ['GET', hero, 'get', 'character-actions'],
    ['PATCH', hero, 'patch', 'character-actions'],
    ['DELETE', hero, 'delete', 'character-actions'],
    ['PUT', `${hero}/notes`, 'notes', 'character-notes-api'],
    ['PUT', `${hero}/goals`, 'goals', 'character-goals-api'],
    ['POST', `${hero}/review`, 'review', 'character-draft-api'],
    ['POST', `${hero}/tokens`, 'tokens.create', 'character-tokens-api'],
    [
        'DELETE',
        `${hero}/tokens/[tokenId]`,
        'tokens.delete',
        'character-tokens-api',
    ],
    ['PUT', `${hero}/choices`, 'choices', 'character-progression-actions'],
    [
        'PATCH',
        `${hero}/resources`,
        'resources',
        'character-progression-actions',
    ],
    ['GET', `${hero}/inventory`, 'inventory', 'character-progression-actions'],
    [
        'PATCH',
        `${hero}/inventory`,
        'inventory.patch',
        'inventory-equip-swap-api',
    ],
    ['GET', `${hero}/stash`, 'stash', 'stash-api'],
    ['POST', `${hero}/stash`, 'stash.apply', 'stash-api'],
    [
        'POST',
        `${hero}/artifacts/transfer`,
        'transfer',
        'character-progression-storage.integration',
    ],
    ['GET', `${hero}/stash/log`, 'stash.log', 'stash-api'],
    [
        'GET',
        `${hero}/stash/free-artifacts`,
        'stash.free-artifacts',
        'stash-api',
    ],
    ['POST', `${hero}/inspiration`, 'inspiration', 'inspiration'],
    [
        'POST',
        `${hero}/roll`,
        'roll',
        'character-progression-storage.integration',
    ],
    ['GET', `${hero}/sheet`, 'sheet', 'character-sheet-api'],
    ['GET', `${hero}/log`, 'log', 'log'],
    [
        'POST',
        `${hero}/progression/seen-level`,
        'progression.seen-level',
        'progression-actions-api',
    ],
    [
        'POST',
        'campaigns/[id]/rest',
        'rest',
        'character-progression-storage.integration',
    ],
    ...systemRows('character', `${hero}/system/[action]`),
    ...systemRows('campaign', 'campaigns/[id]/system/[action]'),
    [
        'POST',
        'campaigns/[id]/experience',
        'experience',
        'character-progression-storage.integration',
    ],
].map(([method, route, operation, testId]) => ({
    method,
    route,
    actionId: `characters.${operation}`,
    testId,
}));
