import { NextResponse } from 'next/server';

import {
    type CampaignScope,
    type CharacterOperation,
} from '../operation-runner';
import { choicesOperation } from './choices';
import { createOperation } from './create';
import { deleteOperation } from './delete';
import { deleteAllOperation } from './delete-all';
import { experienceOperation } from './experience';
import { getOperation } from './get';
import { goalsOperation } from './goals';
import { inspirationOperation } from './inspiration';
import { inventoryUpdateOperation } from './inventory-update';
import { listOperation } from './list';
import { notesOperation } from './notes';
import { patchOperation } from './patch';
import { READ_OPERATIONS } from './reads';
import { resourcesOperation } from './resources';
import { restOperation } from './rest';
import { reviewOperation } from './review';
import { rollOperation } from './roll';
import { rosterOperation } from './roster';
import { stashUpdateOperation } from './stash-update';
import { tokensCreateOperation } from './tokens-create';
import { tokensDeleteOperation } from './tokens-delete';
import { transferOperation } from './transfer';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    mergeSystemOperations,
    operationInComposition,
} from '@/lib/server/systems/registry';
import { errorResponse } from '@/lib/utils/api/api-response';

const erased = (op: unknown) => op as CharacterOperation;

/** Assistant entry points keyed by action name: the same pure `(gate, input)` cores the HTTP routes use. */
const CORE_OPERATIONS: Record<string, CharacterOperation> = {
    create: erased(createOperation),
    list: erased(listOperation),
    roster: erased(rosterOperation),
    get: erased(getOperation),
    patch: erased(patchOperation),
    delete: erased(deleteOperation),
    'delete-all': erased(deleteAllOperation),
    review: erased(reviewOperation),
    notes: erased(notesOperation),
    goals: erased(goalsOperation),
    'tokens.create': erased(tokensCreateOperation),
    'tokens.delete': erased(tokensDeleteOperation),
    choices: erased(choicesOperation),
    resources: erased(resourcesOperation),
    'inventory.patch': erased(inventoryUpdateOperation),
    'stash.apply': erased(stashUpdateOperation),
    transfer: erased(transferOperation),
    inspiration: erased(inspirationOperation),
    rest: erased(restOperation),
    experience: erased(experienceOperation),
    roll: erased(rollOperation),
    ...Object.fromEntries(
        Object.entries(READ_OPERATIONS).map(([key, op]) => [key, erased(op)])
    ),
};

const isCampaignScope = (gate: unknown): gate is CampaignScope =>
    typeof gate === 'object' && gate !== null && 'access' in gate;

/** Registry imports its modules, so a module's own gate cannot ask it whether the operation is in the composition. */
const inCompositionOnly = (
    operation: CharacterOperation
): CharacterOperation => ({
    ...operation,
    gate: async (ctx) => {
        const gate = await operation.gate(ctx);

        if (gate instanceof NextResponse) return gate;

        return isCampaignScope(gate) &&
            operationInComposition(gate.access.campaign.rules, operation.name)
            ? gate
            : errorResponse(API_ERRORS.NOT_FOUND, 404);
    },
});

export const CHARACTER_OPERATIONS = mergeSystemOperations(
    CORE_OPERATIONS,
    ({ operation, scoped }) =>
        scoped ? inCompositionOnly(operation) : operation
);
